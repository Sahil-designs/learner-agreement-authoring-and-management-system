// Acceptance lookup: search a learner, see exactly which version of which
// agreement they accepted, and when. This is the compliance close-out.

import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import { allLearners, learnerRecord, courseName, planName, liveVersion } from '../state/selectors.js'
import { fmtDateTime, fmtVersion } from '../lib/format.js'
import { Badge, EmptyState, ErrorState, Modal, TableSkeleton, useFakeLoad } from '../components/Ui.jsx'
import { DocView } from '../components/DocView.jsx'

export function Acceptances() {
  const { state, dispatch, navigate } = useApp()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [viewing, setViewing] = useState(null)
  const [loading] = useFakeLoad()

  const learners = allLearners(state)
  const record = submitted ? learnerRecord(state, submitted) : null

  const search = (value) => {
    setQuery(value)
    setSubmitted(value.trim())
  }

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <h1>Acceptance lookup</h1>
          <p>
            Read-only. Search a learner ID to see which agreement version they accepted for each
            enrolled course, and when. Acceptances are append-only — a re-consent adds a row, it never
            replaces the original.
          </p>
        </div>
      </div>

      <div className="filters">
        <div className="field" style={{ flex: 1, maxWidth: 420 }}>
          <label className="field-label">Learner ID</label>
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()) }}>
            <input
              className="input"
              placeholder="e.g. ENT-LRN-10234"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>
        <button className="btn btn-primary" style={{ marginBottom: 2 }} onClick={() => setSubmitted(query.trim())}>
          Look up
        </button>
        {submitted && (
          <button className="btn" style={{ marginBottom: 2 }} onClick={() => { setQuery(''); setSubmitted('') }}>
            Clear
          </button>
        )}
        <div className="filters-spacer" />
        <div className="filters-count">{state.acceptances.length} acceptance records on file</div>
      </div>

      {state.simulateError ? (
        <div className="card">
          <ErrorState what="acceptance records" onRetry={() => dispatch({ type: 'SET_SIMULATE_ERROR', value: false })} />
        </div>
      ) : loading ? (
        <div className="card"><TableSkeleton rows={5} cols={4} /></div>
      ) : !submitted ? (
        <LearnerDirectory learners={learners} state={state} onPick={search} />
      ) : !record ? (
        <div className="card">
          <EmptyState
            icon="🔍"
            title={`No learner found for “${submitted}”`}
            actions={<button className="btn" onClick={() => { setQuery(''); setSubmitted('') }}>Back to the directory</button>}
          >
            Learner IDs look like <strong>ENT-LRN-10234</strong>. Only learners with at least one
            recorded acceptance appear here.
          </EmptyState>
        </div>
      ) : (
        <LearnerResult record={record} state={state} onView={setViewing} onNavigate={navigate} />
      )}

      {viewing && (
        <Modal
          title={`${viewing.agreement.name} — v${viewing.acceptance.version}`}
          subtitle={`Exactly what ${viewing.learnerName} accepted on ${fmtDateTime(viewing.acceptance.acceptedAt)}`}
          size="modal-xl"
          onClose={() => setViewing(null)}
          footer={
            <>
              <span className="modal-foot-note">
                This is the frozen snapshot from the moment of acceptance. Later versions did not
                change it.
              </span>
              <button className="btn" onClick={() => setViewing(null)}>Close</button>
            </>
          }
        >
          <DocView doc={viewing.version} />
        </Modal>
      )}
    </div>
  )
}

function LearnerDirectory({ learners, state, onPick }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Learners with acceptance records</h3>
          <p>Search above, or pick one to see their record.</p>
        </div>
      </div>
      {!learners.length ? (
        <EmptyState icon="👤" title="No acceptance records yet">
          Acceptance records are written when a learner accepts an agreement at enrollment, or
          re-accepts after a retroactive publish.
        </EmptyState>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Learner ID</th>
              <th>Name</th>
              <th>Enrolled agreements</th>
              <th>Acceptance records</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {learners.map((l) => {
              const rows = state.acceptances.filter((a) => a.learnerId === l.id)
              const agreements = new Set(rows.map((r) => r.agreementId))
              return (
                <tr key={l.id} className="clickable" onClick={() => onPick(l.id)}>
                  <td><span className="chip chip-mono">{l.id}</span></td>
                  <td className="cell-title">{l.name}</td>
                  <td>{agreements.size}</td>
                  <td>{rows.length}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => onPick(l.id)}>View record</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function LearnerResult({ record, state, onView, onNavigate }) {
  const pending = record.enrollments.filter((e) => e.pendingReconsent).length

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <div>
            <h3>{record.learnerName}</h3>
            <p><span className="chip chip-mono">{record.learnerId}</span></p>
          </div>
          <div className="spacer" />
          {pending > 0 ? (
            <Badge tone="amber">{pending} pending re-consent</Badge>
          ) : (
            <Badge tone="green">Up to date on every enrollment</Badge>
          )}
        </div>
      </div>

      {record.enrollments.map((e) => {
        const ag = e.agreement
        const live = liveVersion(ag)
        return (
          <div className="card" key={e.agreementId}>
            <div className="card-head">
              <div>
                <h3>{ag?.name || 'Unknown agreement'}</h3>
                <p>{courseName(ag?.courseId)} · {planName(ag?.planId)}</p>
              </div>
              <div className="spacer" />
              <div className="row" style={{ gap: 8 }}>
                <span className="chip">Bound to <strong>{fmtVersion(e.current.version)}</strong></span>
                <span className="chip">Live is <strong>{fmtVersion(e.liveVersionNumber)}</strong></span>
                {e.pendingReconsent ? (
                  <Badge tone="amber">Pending re-consent</Badge>
                ) : e.behind ? (
                  <Badge tone="grey">Behind live, not required to re-accept</Badge>
                ) : (
                  <Badge tone="green">Current</Badge>
                )}
                <button className="btn btn-sm" onClick={() => onNavigate('history', e.agreementId)}>Version history</button>
              </div>
            </div>

            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Version</th>
                  <th style={{ width: 220 }}>Accepted at</th>
                  <th style={{ width: 170 }}>Trigger</th>
                  <th>What this version said</th>
                  <th style={{ width: 150 }} />
                </tr>
              </thead>
              <tbody>
                {e.acceptances.map((acc) => {
                  const version = ag?.versions.find((v) => v.version === acc.version)
                  return (
                    <tr key={acc.id}>
                      <td className="cell-num"><strong>v{acc.version}</strong></td>
                      <td>{fmtDateTime(acc.acceptedAt)}</td>
                      <td>
                        <Badge tone={acc.trigger === 're-consent' ? 'amber' : 'blue'}>
                          {acc.trigger === 're-consent' ? 'Re-consent' : 'At enrollment'}
                        </Badge>
                      </td>
                      <td className="small muted">{version?.changeSummary || 'Version not found'}</td>
                      <td>
                        <div className="row-actions">
                          {version && (
                            <button
                              className="btn btn-sm"
                              onClick={() => onView({ agreement: ag, acceptance: acc, version, learnerName: record.learnerName })}
                            >
                              View what they signed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {e.acceptances.length > 1 && (
              <div className="card-head" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
                <p className="small muted">
                  Two records, both kept. The original acceptance of v{e.acceptances[e.acceptances.length - 1].version} was
                  never overwritten when v{e.current.version} was published retroactively — which is what lets
                  you prove what this learner agreed to at any point in time.
                </p>
              </div>
            )}

            {e.pendingReconsent && live && (
              <div className="card-head" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
                <p className="small muted">
                  v{live.version} was published retroactively, so this learner has been prompted to
                  accept it. Until they do, they remain bound by v{e.current.version}.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

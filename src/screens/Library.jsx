// The landing screen: every agreement, filterable, plus the course x plan
// coverage view that answers "which combinations don't exist yet".

import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import {
  agreementStatus, courseName, planName, userName, lastEdited, liveVersion,
  filterAgreements, coverageMatrix, coverageStats, STATUS_OPTIONS, isLegalOwner, openRequestsFor,
} from '../state/selectors.js'
import { COURSES, PLANS } from '../data/seed.js'
import { fmtDate, fmtNumber, fmtVersion } from '../lib/format.js'
import {
  Badge, StatusBadge, Field, Select, Modal, EmptyState, ErrorState,
  TableSkeleton, Segmented, useFakeLoad,
} from '../components/Ui.jsx'
import { RequestChangeModal } from './ChangeRequests.jsx'

const BLANK_FILTERS = { course: '', plan: '', status: '', query: '' }

export function Library() {
  const { state, dispatch, user, navigate } = useApp()
  const [filters, setFilters] = useState(BLANK_FILTERS)
  const [view, setView] = useState('list')
  const [creating, setCreating] = useState(null)
  const [requesting, setRequesting] = useState(null)
  const [loading, reload] = useFakeLoad()

  const canEdit = isLegalOwner(user)
  const rows = useMemo(() => filterAgreements(state.agreements, filters), [state.agreements, filters])
  const filtered = filters.course || filters.plan || filters.status || filters.query
  const stats = coverageStats(state.agreements)

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <h1>Agreement library</h1>
          <p>
            Every learner agreement, by course and plan. Content varies by course <strong>×</strong> plan,
            so a new combination starts by duplicating the closest existing agreement rather than being
            written from scratch.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate('audit')}>Audit log</button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setCreating({ mode: 'duplicate' })}>
              + New agreement
            </button>
          )}
        </div>
      </div>

      <div className="row mb-16" style={{ gap: 10 }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: `All agreements (${state.agreements.length})` },
            { value: 'coverage', label: `Course × plan coverage (${stats.covered}/${stats.total})` },
          ]}
        />
        {view === 'coverage' && stats.gaps > 0 && (
          <Badge tone="amber">{stats.gaps} combinations have no agreement</Badge>
        )}
      </div>

      {view === 'coverage' ? (
        <CoverageMatrix
          agreements={state.agreements}
          canEdit={canEdit}
          onOpen={(ag) => navigate('editor', ag.id)}
          onCreate={(course, plan) =>
            setCreating({ mode: 'duplicate', courseId: course.id, planId: plan.id })
          }
        />
      ) : (
        <>
          <div className="filters">
            <Field label="Course">
              <Select value={filters.course} onChange={(v) => set('course', v)} placeholder="All courses"
                options={COURSES.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Plan">
              <Select value={filters.plan} onChange={(v) => set('plan', v)} placeholder="All plans"
                options={PLANS.map((p) => ({ value: p.id, label: p.name }))} />
            </Field>
            <Field label="Status">
              <Select value={filters.status} onChange={(v) => set('status', v)} placeholder="Any status"
                options={STATUS_OPTIONS} />
            </Field>
            <Field label="Search name or clause text">
              <input className="input" placeholder="e.g. refund, NSDC, DPDP"
                value={filters.query} onChange={(e) => set('query', e.target.value)} />
            </Field>
            <div className="filters-spacer" />
            <div className="filters-count">
              {rows.length} of {state.agreements.length} shown
            </div>
            {filtered && (
              <button className="btn btn-sm" style={{ marginBottom: 2 }} onClick={() => setFilters(BLANK_FILTERS)}>
                Clear filters
              </button>
            )}
          </div>

          <div className="card">
            {state.simulateError ? (
              <ErrorState what="the agreement library" onRetry={() => dispatch({ type: 'SET_SIMULATE_ERROR', value: false })} />
            ) : loading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : !state.agreements.length ? (
              <EmptyState
                icon="📄"
                title="No agreements yet"
                actions={canEdit && <button className="btn btn-primary" onClick={() => setCreating({ mode: 'blank' })}>Create the first agreement</button>}
              >
                Nothing has been authored in Streamline yet. Create the first agreement, then every
                later course and plan combination can be duplicated from it.
              </EmptyState>
            ) : !rows.length ? (
              <EmptyState
                icon="🔍"
                title="No agreements match these filters"
                actions={
                  <>
                    <button className="btn" onClick={() => setFilters(BLANK_FILTERS)}>Clear filters</button>
                    {canEdit && (
                      <button className="btn btn-primary" onClick={() => setCreating({ mode: 'duplicate', courseId: filters.course, planId: filters.plan })}>
                        Create this combination
                      </button>
                    )}
                  </>
                }
              >
                {filters.query
                  ? `Nothing matches “${filters.query}”. The search covers agreement names and the full clause text of the live version.`
                  : 'That course, plan and status combination has no agreement. You can create it by duplicating an existing one.'}
              </EmptyState>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Agreement</th>
                    <th>Course</th>
                    <th>Plan</th>
                    <th>Live version</th>
                    <th>Status</th>
                    <th>Last edited</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ag) => {
                    const status = agreementStatus(ag)
                    const edited = lastEdited(ag)
                    const live = liveVersion(ag)
                    const open = openRequestsFor(state, ag.id).length
                    return (
                      <tr key={ag.id} className="clickable" onClick={() => navigate('editor', ag.id)}>
                        <td>
                          <div className="cell-title">{ag.name}</div>
                          <div className="cell-sub">
                            {fmtNumber(ag.cohort.activeLearners)} active learners
                            {open > 0 && <> · <span style={{ color: 'var(--amber)' }}>{open} open request{open > 1 ? 's' : ''}</span></>}
                          </div>
                        </td>
                        <td>{courseName(ag.courseId)}</td>
                        <td><span className="chip">{planName(ag.planId)}</span></td>
                        <td className="cell-num">
                          <strong>{fmtVersion(status.liveVersionNumber)}</strong>
                          {live && <div className="cell-sub">{fmtDate(live.publishedAt)}</div>}
                        </td>
                        <td>
                          <StatusBadge status={status} />
                          {status.draftNote && <div className="cell-sub">{status.draftNote}</div>}
                        </td>
                        <td>
                          <div>{userName(edited.by)}</div>
                          <div className="cell-sub">{fmtDate(edited.at)} · {edited.what}</div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button className="btn btn-sm" onClick={() => navigate('history', ag.id)}>History</button>
                            {canEdit ? (
                              <button className="btn btn-sm btn-primary" onClick={() => navigate('editor', ag.id)}>Edit</button>
                            ) : (
                              <button className="btn btn-sm" onClick={() => setRequesting(ag)}>Request change</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {creating && (
        <NewAgreementModal
          initial={creating}
          agreements={state.agreements}
          onClose={() => setCreating(null)}
          onCreate={(payload) => {
            dispatch({ type: 'CREATE_AGREEMENT', ...payload })
            setCreating(null)
          }}
        />
      )}

      {requesting && <RequestChangeModal agreement={requesting} onClose={() => setRequesting(null)} />}
    </div>
  )
}

// --------------------------------------------------------------- coverage

function CoverageMatrix({ agreements, canEdit, onOpen, onCreate }) {
  const matrix = coverageMatrix(agreements)
  return (
    <>
      <div className="callout mb-16">
        Agreement content varies by <strong>course × plan</strong>, not by course alone — the same course
        under an NSDC plan carries certification conditions that the standard plan does not. This view
        shows which combinations exist. An empty cell is a gap, and filling it starts from a duplicate.
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="coverage">
          <thead>
            <tr>
              <th style={{ width: 260 }}>Course</th>
              {PLANS.map((p) => (
                <th key={p.id} className="plan-col">
                  {p.name}
                  <div className="small muted" style={{ fontWeight: 400, marginTop: 2 }}>{p.note}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ course, cells }) => (
              <tr key={course.id}>
                <td className="course-col">{course.name}</td>
                {cells.map(({ plan, agreement }) => (
                  <td key={plan.id}>
                    {agreement ? (
                      <button className="cov-cell" onClick={() => onOpen(agreement)}>
                        <div className="row" style={{ gap: 7 }}>
                          <span className="cov-version">{fmtVersion(agreementStatus(agreement).liveVersionNumber)}</span>
                          <StatusBadge status={agreementStatus(agreement)} />
                        </div>
                        <span className="cov-learners">{fmtNumber(agreement.cohort.activeLearners)} learners</span>
                      </button>
                    ) : (
                      <button
                        className="cov-cell cov-cell-empty"
                        onClick={() => canEdit && onCreate(course, plan)}
                        disabled={!canEdit}
                        title={canEdit ? 'Create this combination' : 'Read-only role'}
                      >
                        {canEdit ? '+ create from…' : 'none'}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ----------------------------------------------------------- create / duplicate

function NewAgreementModal({ initial, agreements, onClose, onCreate }) {
  const [courseId, setCourseId] = useState(initial.courseId || '')
  const [planId, setPlanId] = useState(initial.planId || '')
  const [mode, setMode] = useState(initial.mode || 'duplicate')
  const [sourceId, setSourceId] = useState('')
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)

  // Suggest a name so nobody has to invent one mid-demo.
  const suggested =
    courseId && planId ? `${courseName(courseId)} — ${planName(planId)}` : ''
  const finalName = name.trim() || suggested

  const errors = {
    course: touched && !courseId ? 'Pick a course.' : '',
    plan: touched && !planId ? 'Pick a plan.' : '',
    source: touched && mode === 'duplicate' && !sourceId ? 'Pick an agreement to duplicate.' : '',
    name: touched && !finalName ? 'Give the agreement a name.' : '',
  }

  const duplicate = agreements.find((a) => a.id === sourceId)
  const existing = agreements.find((a) => a.courseId === courseId && a.planId === planId)

  // Same course first, then everything else -- the closest base is usually the
  // same course under a different plan.
  const sourceOptions = [...agreements]
    .sort((a, b) => (a.courseId === courseId ? -1 : 0) - (b.courseId === courseId ? -1 : 0))
    .map((a) => ({
      value: a.id,
      label: `${a.name} (${fmtVersion(agreementStatus(a).liveVersionNumber)})`,
    }))

  const submit = () => {
    setTouched(true)
    if (!courseId || !planId || !finalName) return
    if (mode === 'duplicate' && !sourceId) return
    onCreate({
      name: finalName,
      courseId,
      planId,
      sourceAgreementId: mode === 'duplicate' ? sourceId : null,
    })
  }

  return (
    <Modal
      title="New agreement"
      subtitle="Agreements are scoped to one course and one plan."
      onClose={onClose}
      footer={
        <>
          <span className="modal-foot-note">
            {mode === 'duplicate'
              ? 'The duplicate opens as an unpublished draft. Nothing is live until you publish it.'
              : 'A blank agreement opens as an empty draft.'}
          </span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Create draft</button>
        </>
      }
    >
      <div className="grid-2">
        <Field label="Course" required error={errors.course}>
          <Select value={courseId} onChange={setCourseId} placeholder="Select a course"
            options={COURSES.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Plan" required error={errors.plan}>
          <Select value={planId} onChange={setPlanId} placeholder="Select a plan"
            options={PLANS.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
      </div>

      {existing && (
        <div className="callout callout-amber mb-16">
          <strong>{existing.name}</strong> already covers this course and plan. Creating another will
          leave two agreements competing for the same combination.
        </div>
      )}

      <Field label="Agreement name" required error={errors.name}
        hint={!name.trim() && suggested ? `Will be saved as “${suggested}”` : undefined}>
        <input className="input" value={name} placeholder={suggested || 'e.g. Digital Marketing — NSDC Certified'}
          onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Starting point" required>
        <label className={`radio-card${mode === 'duplicate' ? ' selected' : ''}`}>
          <input type="radio" checked={mode === 'duplicate'} onChange={() => setMode('duplicate')} />
          <div>
            <div className="radio-card-title">Duplicate an existing agreement <span className="chip chip-accent">Recommended</span></div>
            <div className="radio-card-desc">
              Copies the full clause structure and annexures of the live version, then you edit only what
              differs for this plan. This is how a new course × plan combination gets covered without
              anyone re-authoring a whole agreement.
            </div>
          </div>
        </label>
        <label className={`radio-card${mode === 'blank' ? ' selected' : ''}`}>
          <input type="radio" checked={mode === 'blank'} onChange={() => setMode('blank')} />
          <div>
            <div className="radio-card-title">Start blank</div>
            <div className="radio-card-desc">An empty document. Use this only when nothing existing is a sensible base.</div>
          </div>
        </label>
      </Field>

      {mode === 'duplicate' && (
        <Field label="Duplicate from" required error={errors.source}>
          <Select value={sourceId} onChange={setSourceId} placeholder="Select an agreement to copy"
            options={sourceOptions} />
          {duplicate && (
            <div className="field-hint">
              Copies {(liveVersion(duplicate)?.blocks || duplicate.draft?.blocks || []).length} blocks
              and {(liveVersion(duplicate)?.annexures || duplicate.draft?.annexures || []).length} annexures
              from <strong>{duplicate.name}</strong>.
            </div>
          )}
        </Field>
      )}
    </Modal>
  )
}

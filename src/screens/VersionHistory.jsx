// Per-agreement version timeline, plus the diff that sells the whole tool.

import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import {
  agreementStatus, courseName, planName, userName, liveVersion, isLegalOwner,
} from '../state/selectors.js'
import { diffDocuments, documentDiffStats } from '../lib/doc.js'
import { fmtDate, fmtDateTime, fmtNumber, fmtVersion } from '../lib/format.js'
import { Badge, StatusBadge, Modal, EmptyState, Segmented } from '../components/Ui.jsx'
import { DocView } from '../components/DocView.jsx'
import { DiffView, DiffStats } from '../components/DiffView.jsx'

export function VersionHistory() {
  const { state, user, navigate, route } = useApp()
  const agreement = state.agreements.find((a) => a.id === route.id)
  const [compare, setCompare] = useState([])
  const [viewing, setViewing] = useState(null)
  // The audit log links straight to "what changed in v3", so honour a version
  // passed in the route by opening that diff immediately.
  const [diffing, setDiffing] = useState(() => {
    const v = Number(route.extra)
    return v > 1 ? [v - 1, v] : null
  })

  if (!agreement) {
    return (
      <div className="page">
        <div className="card">
          <EmptyState icon="🔎" title="That agreement no longer exists"
            actions={<button className="btn btn-primary" onClick={() => navigate('library')}>Back to the library</button>}>
            It may have been removed, or the link may be stale.
          </EmptyState>
        </div>
      </div>
    )
  }

  const versions = [...agreement.versions].reverse()
  const live = liveVersion(agreement)
  const status = agreementStatus(agreement)

  const toggleCompare = (n) =>
    setCompare((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n)
      if (prev.length === 2) return [prev[1], n] // keep the most recent two picks
      return [...prev, n]
    })

  const canCompare = compare.length === 2
  const [a, b] = [...compare].sort((x, y) => x - y)

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <button onClick={() => navigate('library')}>Agreement library</button>
            <span>/</span>
            <button onClick={() => navigate('editor', agreement.id)}>{agreement.name}</button>
          </div>
          <h1>Version history</h1>
          <p>
            Every published version of <strong>{agreement.name}</strong>, with what changed, who
            published it, and whether existing learners had to accept again.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" disabled={!canCompare} onClick={() => setDiffing([a, b])}>
            {canCompare ? `Compare v${a} with v${b}` : 'Select two versions to compare'}
          </button>
          <button className="btn" onClick={() => navigate('editor', agreement.id)}>
            {isLegalOwner(user) ? 'Open editor' : 'View document'}
          </button>
        </div>
      </div>

      <div className="metastrip">
        <div className="metastrip-item">
          <span className="metastrip-label">Agreement</span>
          <span className="metastrip-value">{courseName(agreement.courseId)} · {planName(agreement.planId)}</span>
        </div>
        <div className="metastrip-item">
          <span className="metastrip-label">Live version</span>
          <span className="metastrip-value">{fmtVersion(status.liveVersionNumber)} <StatusBadge status={status} /></span>
        </div>
        <div className="metastrip-item">
          <span className="metastrip-label">Published versions</span>
          <span className="metastrip-value">{agreement.versions.length}</span>
        </div>
        <div className="metastrip-item">
          <span className="metastrip-label">Active learners</span>
          <span className="metastrip-value">{fmtNumber(agreement.cohort.activeLearners)}</span>
        </div>
      </div>

      {!versions.length ? (
        <div className="card">
          <EmptyState
            icon="🕘"
            title="Nothing published yet"
            actions={<button className="btn btn-primary" onClick={() => navigate('editor', agreement.id)}>Open the draft</button>}
          >
            This agreement is still a draft. Once it is published, every version will appear here with
            its change summary and a diff against the version before it.
          </EmptyState>
        </div>
      ) : (
        <div className="timeline">
          {versions.map((v) => {
            const isLive = v.version === live?.version
            const prev = agreement.versions.find((x) => x.version === v.version - 1)
            return (
              <div key={v.version} className={`tl-item${isLive ? ' is-live' : ''}${v.retroactive ? ' is-retro' : ''}`}>
                <span className="tl-dot" />
                <div className={`tl-card${isLive ? ' is-live' : ''}`}>
                  <div className="tl-head">
                    <span className="tl-version">v{v.version}</span>
                    {isLive && <Badge tone="green">Live</Badge>}
                    {v.retroactive ? <Badge tone="amber">Re-consent triggered</Badge> : <Badge tone="grey">New enrollments only</Badge>}
                    <span className="tl-meta">
                      {fmtDateTime(v.publishedAt)} · {userName(v.publishedBy)}
                    </span>
                  </div>

                  <p className="tl-summary">{v.changeSummary}</p>

                  {v.effectiveFrom && v.effectiveFrom !== v.publishedAt && (
                    <p className="small muted" style={{ marginTop: 7 }}>
                      Effective from {fmtDate(v.effectiveFrom)}
                    </p>
                  )}

                  {v.reconsent && (
                    <div className="reconsent-stats">
                      <div className="rs-item">
                        <span className="rs-figure">{fmtNumber(v.reconsent.prompted)}</span>
                        <span className="rs-label">prompted</span>
                      </div>
                      <div className="rs-item">
                        <span className="rs-figure">{fmtNumber(v.reconsent.reAccepted)}</span>
                        <span className="rs-label">re-accepted</span>
                      </div>
                      <div className="rs-item">
                        <span className="rs-figure">{fmtNumber(v.reconsent.pending)}</span>
                        <span className="rs-label">still pending</span>
                      </div>
                    </div>
                  )}

                  <div className="tl-foot">
                    <span className="tl-compare">
                      <label>
                        <input type="checkbox" checked={compare.includes(v.version)} onChange={() => toggleCompare(v.version)} />
                        Compare
                      </label>
                    </span>
                    <button className="btn btn-sm" onClick={() => setViewing(v)}>View v{v.version}</button>
                    {prev && (
                      <button className="btn btn-sm" onClick={() => setDiffing([prev.version, v.version])}>
                        What changed from v{prev.version}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewing && (
        <Modal
          title={`${agreement.name} — v${viewing.version}`}
          subtitle={`Published ${fmtDateTime(viewing.publishedAt)} by ${userName(viewing.publishedBy)} · read-only`}
          size="modal-xl"
          onClose={() => setViewing(null)}
          footer={
            <>
              <span className="modal-foot-note">
                Past versions are read-only. Rolling back is deliberately not supported — a correction
                is published as a new version so the record stays complete.
              </span>
              <button className="btn" onClick={() => setViewing(null)}>Close</button>
            </>
          }
        >
          <DocView doc={viewing} />
        </Modal>
      )}

      {diffing && (
        <DiffModal agreement={agreement} from={diffing[0]} to={diffing[1]} onClose={() => setDiffing(null)} />
      )}
    </div>
  )
}

function DiffModal({ agreement, from, to, onClose }) {
  const [mode, setMode] = useState('split')
  const [onlyChanges, setOnlyChanges] = useState(true)

  const vFrom = agreement.versions.find((v) => v.version === from)
  const vTo = agreement.versions.find((v) => v.version === to)
  const diff = useMemo(() => diffDocuments(vFrom, vTo), [vFrom, vTo])
  const stats = documentDiffStats(diff)

  return (
    <Modal
      title={`What changed: v${from} → v${to}`}
      subtitle={agreement.name}
      size="modal-xl"
      onClose={onClose}
      footer={
        <>
          <span className="modal-foot-note">
            v{from} stays exactly as it was. Learners who accepted it remain bound to it unless they
            re-consented to a later version.
          </span>
          <button className="btn" onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="diff-controls">
        <Segmented value={mode} onChange={setMode}
          options={[{ value: 'split', label: 'Side by side' }, { value: 'inline', label: 'Inline' }]} />
        <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} />
          Only show changes
        </label>
        <div className="spacer" />
        <DiffStats stats={stats} />
      </div>

      <div className="callout mb-16">
        <strong>v{to}</strong> — {vTo.changeSummary}
      </div>

      <DiffView
        diff={diff}
        mode={mode}
        onlyChanges={onlyChanges}
        leftLabel={`v${from} · ${fmtDate(vFrom.publishedAt)}`}
        rightLabel={`v${to} · ${fmtDate(vTo.publishedAt)}`}
      />
    </Modal>
  )
}

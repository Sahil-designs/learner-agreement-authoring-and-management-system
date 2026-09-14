// Change requests: the tracked replacement for "hey, can legal tweak this?" in
// a Slack thread.

import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import {
  REQUEST_STATUS, requestRef, courseName, planName, userName, userById,
  liveVersion, isLegalOwner,
} from '../state/selectors.js'
import { sectionsOf } from '../lib/doc.js'
import { fmtDateTime, fmtRelative } from '../lib/format.js'
import {
  Badge, Field, Select, Modal, EmptyState, ErrorState, TableSkeleton, useFakeLoad,
} from '../components/Ui.jsx'

const PRIORITIES = ['High', 'Medium', 'Low'].map((p) => ({ value: p, label: p }))
const PRIORITY_TONE = { High: 'red', Medium: 'amber', Low: 'grey' }

const STATUS_FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'rejected', label: 'Rejected' },
]

// -------------------------------------------------------------- raise a request

export function RequestChangeModal({ agreement, onClose }) {
  const { dispatch } = useApp()
  const live = liveVersion(agreement)
  const sections = useMemo(() => sectionsOf(live?.blocks || agreement.draft?.blocks || []), [live, agreement])

  const [section, setSection] = useState('')
  const [request, setRequest] = useState('')
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [touched, setTouched] = useState(false)

  const errors = {
    section: touched && !section ? 'Pick the section this affects.' : '',
    request: touched && !request.trim() ? 'Describe the change you need.' : '',
    reason: touched && !reason.trim() ? 'Legal will ask why — say it here.' : '',
  }

  const submit = () => {
    setTouched(true)
    if (!section || !request.trim() || !reason.trim()) return
    dispatch({
      type: 'SUBMIT_REQUEST',
      agreementId: agreement.id,
      section,
      request: request.trim(),
      reason: reason.trim(),
      priority,
    })
    onClose()
  }

  return (
    <Modal
      title="Request a change"
      subtitle={`${agreement.name} · ${courseName(agreement.courseId)} · ${planName(agreement.planId)}`}
      onClose={onClose}
      footer={
        <>
          <span className="modal-foot-note">
            Your role can’t edit agreement content. This request goes to the legal team’s queue and is
            tracked to a decision.
          </span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Submit request</button>
        </>
      }
    >
      <Field label="Which section?" required error={errors.section}>
        <Select
          value={section}
          onChange={setSection}
          placeholder="Select a section"
          options={[
            ...sections.map((s) => ({ value: s, label: s })),
            { value: 'Whole agreement', label: 'Whole agreement / not section specific' },
          ]}
        />
      </Field>

      <Field label="What change do you need?" required error={errors.request}>
        <textarea className="textarea" value={request} onChange={(e) => setRequest(e.target.value)}
          placeholder="Describe the change in plain language. Quote the clause if it helps." />
      </Field>

      <Field label="Why?" required error={errors.reason}
        hint="Volumes, escalations, a regulatory deadline — whatever makes the case.">
        <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Roughly 20 support escalations a month, two of which became consumer forum notices." />
      </Field>

      <Field label="Priority" required>
        <Select value={priority} onChange={setPriority} options={PRIORITIES} />
      </Field>
    </Modal>
  )
}

// ------------------------------------------------------------------- the queue

export function ChangeRequests() {
  const { state, dispatch, user, navigate, route } = useApp()
  const [status, setStatus] = useState('')
  const [agreementId, setAgreementId] = useState('')
  const [loading, reload] = useFakeLoad()
  const canAction = isLegalOwner(user)

  const openId = route.id || null
  const selected = state.changeRequests.find((r) => r.id === openId) || null

  const rows = state.changeRequests.filter((r) => {
    if (status && r.status !== status) return false
    if (agreementId && r.agreementId !== agreementId) return false
    return true
  })

  const counts = STATUS_FILTERS.map((s) => ({
    ...s,
    n: state.changeRequests.filter((r) => r.status === s.value).length,
  }))

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <h1>Change requests</h1>
          <p>
            Requests raised by product, operations and compliance against a specific section of a
            specific agreement. Every one ends in a decision that is on the record.
          </p>
        </div>
      </div>

      <div className="grid-3 mb-16" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {counts.map((c) => (
          <button
            key={c.value}
            className="stat"
            style={{ textAlign: 'left', cursor: 'pointer', borderColor: status === c.value ? 'var(--accent)' : undefined }}
            onClick={() => setStatus(status === c.value ? '' : c.value)}
          >
            <div className="stat-label">{c.label}</div>
            <div className="stat-figure">{c.n}</div>
            <div className="stat-note">{status === c.value ? 'Filtering by this' : 'Click to filter'}</div>
          </button>
        ))}
      </div>

      <div className="filters">
        <Field label="Agreement">
          <Select value={agreementId} onChange={setAgreementId} placeholder="All agreements"
            options={state.agreements.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={setStatus} placeholder="Any status" options={STATUS_FILTERS} />
        </Field>
        <div className="filters-spacer" />
        <div className="filters-count">{rows.length} of {state.changeRequests.length} shown</div>
        {(status || agreementId) && (
          <button className="btn btn-sm" style={{ marginBottom: 2 }}
            onClick={() => { setStatus(''); setAgreementId('') }}>Clear filters</button>
        )}
      </div>

      <div className="card">
        {state.simulateError ? (
          <ErrorState what="the change request queue" onRetry={() => dispatch({ type: 'SET_SIMULATE_ERROR', value: false })} />
        ) : loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : !state.changeRequests.length ? (
          <EmptyState icon="📥" title="No change requests yet">
            When someone outside legal needs a wording change, they raise it from the agreement library.
            It lands here instead of in a Slack thread.
          </EmptyState>
        ) : !rows.length ? (
          <EmptyState
            icon="🔍"
            title="No requests match these filters"
            actions={<button className="btn" onClick={() => { setStatus(''); setAgreementId('') }}>Clear filters</button>}
          >
            Try a different status or agreement.
          </EmptyState>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Agreement &amp; section</th>
                <th>Requested by</th>
                <th>Raised</th>
                <th>Priority</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ag = state.agreements.find((a) => a.id === r.agreementId)
                return (
                  <tr key={r.id} className="clickable" onClick={() => navigate('requests', r.id)}>
                    <td><span className="chip chip-mono">{requestRef(r)}</span></td>
                    <td>
                      <div className="cell-title">{ag?.name || 'Unknown agreement'}</div>
                      <div className="cell-sub">{r.section}</div>
                    </td>
                    <td>
                      <div>{userName(r.requestedBy)}</div>
                      <div className="cell-sub">{userById(r.requestedBy)?.title}</div>
                    </td>
                    <td>
                      <div>{fmtRelative(r.createdAt)}</div>
                      <div className="cell-sub">{fmtDateTime(r.createdAt)}</div>
                    </td>
                    <td><Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge></td>
                    <td><Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="btn btn-sm" onClick={() => navigate('requests', r.id)}>Open</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <RequestDetail
          request={selected}
          canAction={canAction}
          agreement={state.agreements.find((a) => a.id === selected.agreementId)}
          onClose={() => navigate('requests')}
          onUpdate={(payload) => dispatch({ type: 'UPDATE_REQUEST', requestId: selected.id, ...payload })}
          onOpenEditor={() => {
            if (selected.status === 'open') {
              dispatch({ type: 'UPDATE_REQUEST', requestId: selected.id, status: 'in_review' })
            }
            navigate('editor', selected.agreementId, selected.id)
          }}
        />
      )}
    </div>
  )
}

function RequestDetail({ request, agreement, canAction, onClose, onUpdate, onOpenEditor }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const settled = request.status === 'actioned' || request.status === 'rejected'

  return (
    <Modal
      title={`${requestRef(request)} — ${request.section}`}
      subtitle={agreement?.name}
      onClose={onClose}
      size="modal-lg"
      footer={
        canAction && !settled ? (
          <>
            <span className="modal-foot-note">
              Actioning opens the editor with this request pinned beside the document, so the wording
              change and the reason for it stay together.
            </span>
            <button className="btn" onClick={onClose}>Close</button>
            <button className="btn btn-danger" onClick={() => setRejecting(true)}>Reject…</button>
            {request.status === 'open' && (
              <button className="btn" onClick={() => onUpdate({ status: 'in_review' })}>Move to in review</button>
            )}
            <button className="btn btn-primary" onClick={onOpenEditor}>Action in editor →</button>
          </>
        ) : (
          <>
            {settled && (
              <span className="modal-foot-note">
                {REQUEST_STATUS[request.status].label} by {userName(request.actionedBy)} on {fmtDateTime(request.actionedAt)}.
              </span>
            )}
            <button className="btn" onClick={onClose}>Close</button>
            {canAction && settled && (
              <button className="btn" onClick={() => onUpdate({ status: 'open' })}>Reopen</button>
            )}
          </>
        )
      }
    >
      <div className="row row-wrap mb-16" style={{ gap: 8 }}>
        <Badge tone={REQUEST_STATUS[request.status].tone}>{REQUEST_STATUS[request.status].label}</Badge>
        <Badge tone={PRIORITY_TONE[request.priority]}>{request.priority} priority</Badge>
        <span className="chip">{courseName(agreement?.courseId)}</span>
        <span className="chip">{planName(agreement?.planId)}</span>
      </div>

      <Field label="Requested change">
        <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>{request.request}</p>
      </Field>
      <Field label="Why">
        <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>{request.reason}</p>
      </Field>
      <div className="grid-2">
        <Field label="Raised by">
          <p>{userName(request.requestedBy)} — <span className="muted">{userById(request.requestedBy)?.title}</span></p>
          <p className="small muted" style={{ marginTop: 3 }}>{fmtDateTime(request.createdAt)}</p>
        </Field>
        <Field label="Section">
          <p>{request.section}</p>
        </Field>
      </div>

      {request.resolution && (
        <Field label="Resolution">
          <div className="callout">{request.resolution}</div>
        </Field>
      )}

      {rejecting && (
        <Field label="Reason for rejecting" required
          hint="The requester sees this. Say what you'd accept instead, if anything.">
          <textarea className="textarea" value={note} autoFocus onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. The registration fee is separately refundable and reported separately for GST…" />
          <div className="row" style={{ marginTop: 9 }}>
            <button className="btn" onClick={() => setRejecting(false)}>Cancel</button>
            <button className="btn btn-danger" disabled={!note.trim()}
              onClick={() => { onUpdate({ status: 'rejected', resolution: note.trim() }); setRejecting(false); onClose() }}>
              Confirm rejection
            </button>
          </div>
        </Field>
      )}
    </Modal>
  )
}

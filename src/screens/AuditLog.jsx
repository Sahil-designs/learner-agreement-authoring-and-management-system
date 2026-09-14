// "Who did what, when" — the answer to the question the Google Doc could never
// answer.

import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import { AUDIT_TYPES, filterAudit, userName, userById } from '../state/selectors.js'
import { USERS } from '../data/seed.js'
import { fmtDateTime, fmtRelative } from '../lib/format.js'
import { Badge, Field, Select, EmptyState, ErrorState, TableSkeleton, useFakeLoad } from '../components/Ui.jsx'

const TYPE_TONE = {
  version_published: 'green',
  reconsent_triggered: 'amber',
  change_request_raised: 'blue',
  change_request_actioned: 'blue',
  change_request_updated: 'blue',
  draft_saved: 'grey',
  draft_discarded: 'grey',
  draft_submitted: 'amber',
  draft_approved: 'green',
  agreement_created: 'blue',
}

const BLANK = { user: '', agreement: '', type: '', from: '', to: '', query: '' }

export function AuditLog() {
  const { state, dispatch, navigate } = useApp()
  const [filters, setFilters] = useState(BLANK)
  const [loading] = useFakeLoad()

  const rows = useMemo(() => filterAudit(state.audit, filters), [state.audit, filters])
  const active = Object.entries(filters).some(([, v]) => v)
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>
            Every change to every agreement, in one place. Entries are written by the same action that
            makes the change, so the log cannot drift out of step with what actually happened.
          </p>
        </div>
      </div>

      <div className="filters">
        <Field label="User">
          <Select value={filters.user} onChange={(v) => set('user', v)} placeholder="Anyone"
            options={USERS.map((u) => ({ value: u.id, label: u.name }))} />
        </Field>
        <Field label="Agreement">
          <Select value={filters.agreement} onChange={(v) => set('agreement', v)} placeholder="All agreements"
            options={state.agreements.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
        <Field label="Event">
          <Select value={filters.type} onChange={(v) => set('type', v)} placeholder="All events"
            options={Object.entries(AUDIT_TYPES).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="From">
          <input className="input" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} style={{ minWidth: 148 }} />
        </Field>
        <Field label="To">
          <input className="input" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} style={{ minWidth: 148 }} />
        </Field>
        <Field label="Search">
          <input className="input" placeholder="e.g. refund, DPDP" value={filters.query} onChange={(e) => set('query', e.target.value)} />
        </Field>
        <div className="filters-spacer" />
        <div className="filters-count">{rows.length} of {state.audit.length} entries</div>
        {active && (
          <button className="btn btn-sm" style={{ marginBottom: 2 }} onClick={() => setFilters(BLANK)}>Clear filters</button>
        )}
      </div>

      <div className="card">
        {state.simulateError ? (
          <ErrorState what="the audit log" onRetry={() => dispatch({ type: 'SET_SIMULATE_ERROR', value: false })} />
        ) : loading ? (
          <TableSkeleton rows={7} cols={4} />
        ) : !state.audit.length ? (
          <EmptyState icon="🗒" title="Nothing has happened yet">
            The audit log fills itself as agreements are created, drafted, published and requested.
          </EmptyState>
        ) : !rows.length ? (
          <EmptyState icon="🔍" title="No entries match these filters"
            actions={<button className="btn" onClick={() => setFilters(BLANK)}>Clear filters</button>}>
            Try widening the date range or clearing the event type.
          </EmptyState>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 190 }}>When</th>
                <th style={{ width: 180 }}>Who</th>
                <th style={{ width: 190 }}>Event</th>
                <th>What</th>
                <th style={{ width: 130 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const ag = state.agreements.find((a) => a.id === e.agreementId)
                return (
                  <tr key={e.id}>
                    <td>
                      <div>{fmtDateTime(e.at)}</div>
                      <div className="cell-sub">{fmtRelative(e.at)}</div>
                    </td>
                    <td>
                      <div className="cell-title">{userName(e.userId)}</div>
                      <div className="cell-sub">{userById(e.userId)?.title}</div>
                    </td>
                    <td><Badge tone={TYPE_TONE[e.type] || 'grey'}>{AUDIT_TYPES[e.type] || e.type}</Badge></td>
                    <td>
                      <div>{e.summary}</div>
                      {ag && <div className="cell-sub">{ag.name}</div>}
                    </td>
                    <td>
                      <div className="row-actions">
                        {e.type === 'version_published' && e.version > 1 ? (
                          <button className="btn btn-sm" onClick={() => navigate('history', e.agreementId, String(e.version))}>
                            View diff
                          </button>
                        ) : e.requestId ? (
                          <button className="btn btn-sm" onClick={() => navigate('requests', e.requestId)}>Open request</button>
                        ) : ag ? (
                          <button className="btn btn-sm" onClick={() => navigate('history', e.agreementId)}>History</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

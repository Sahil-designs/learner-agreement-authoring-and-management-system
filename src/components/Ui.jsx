// Small shared primitives. Deliberately plain -- no component library.

import { useEffect, useState } from 'react'

export function Badge({ tone = 'grey', children, plain = false }) {
  return <span className={`badge badge-${tone}${plain ? ' badge-plain' : ''}`}>{children}</span>
}

const STATUS_TONE = { published: 'green', draft: 'grey', pending_approval: 'amber' }

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status.key]}>{status.label}</Badge>

export function Field({ label, required, hint, error, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="field-req">*</span>}
        </label>
      )}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function Modal({ title, subtitle, onClose, children, footer, size = '' }) {
  // Escape closes. Every modal in the app gets this for free.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon = '◦', title, children, actions }) {
  return (
    <div className="state">
      <div className="state-icon">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {actions && <div className="state-actions">{actions}</div>}
    </div>
  )
}

export function ErrorState({ onRetry, what = 'this list' }) {
  return (
    <div className="state state-error">
      <div className="state-icon">⚠</div>
      <h3>Couldn’t load {what}</h3>
      <p>
        The request failed before any data came back. Nothing has been changed. Retry, or carry on —
        other screens are unaffected.
      </p>
      <div className="state-actions">
        <button className="btn btn-primary" onClick={onRetry}>Retry</button>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skel-row" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton"
              style={{ height: 13, flex: c === 0 ? 2.4 : 1, opacity: 1 - r * 0.11 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts">
      {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(() => onDismiss(toast.id), 5200)
    return () => clearTimeout(id)
  }, [toast.id, onDismiss])

  return (
    <div className={`toast toast-${toast.tone}`}>
      <span className="toast-icon">{toast.tone === 'error' ? '✕' : '✓'}</span>
      <span>{toast.message}</span>
      <button className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">×</button>
    </div>
  )
}

export const Stat = ({ label, figure, note }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className="stat-figure">{figure}</div>
    {note && <div className="stat-note">{note}</div>}
  </div>
)

export const Segmented = ({ value, onChange, options }) => (
  <div className="segmented">
    {options.map((o) => (
      <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
)

/**
 * Fakes the brief load every list view would really have. Stakeholders click
 * into the loading and empty cases, so both need to be real code paths rather
 * than branches that can never run.
 */
export function useFakeLoad(ms = 420) {
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [ms, nonce])
  return [loading, () => setNonce((n) => n + 1)]
}

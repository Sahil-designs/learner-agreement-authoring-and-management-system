// The publish decision, which is the one legal actually cares about: does this
// bind only new enrollments, or does everyone have to agree again?

import { useState } from 'react'
import { Modal, Field } from './Ui.jsx'
import { DiffStats } from './DiffView.jsx'
import { fmtNumber } from '../lib/format.js'
import { documentDiffStats } from '../lib/doc.js'

export function PublishModal({ agreement, diff, nextVersion, impact, prefillSummary, onClose, onPublish }) {
  const [summary, setSummary] = useState(prefillSummary || '')
  const [retroactive, setRetroactive] = useState(false)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [touched, setTouched] = useState(false)

  const summaryError = touched && !summary.trim() ? 'A change summary is required before publishing.' : ''
  const stats = diff ? documentDiffStats(diff) : null

  const submit = () => {
    setTouched(true)
    if (!summary.trim()) return
    onPublish({
      changeSummary: summary.trim(),
      retroactive,
      effectiveFrom: effectiveFrom ? new Date(`${effectiveFrom}T00:00:00`).toISOString() : null,
    })
  }

  return (
    <Modal
      title={`Publish v${nextVersion}`}
      subtitle={`${agreement.name}. Publishing appends a new version; nothing already accepted by a learner is changed.`}
      onClose={onClose}
      size="modal-lg"
      footer={
        <>
          <span className="modal-foot-note">
            {retroactive
              ? `${fmtNumber(impact)} learners will be asked to accept v${nextVersion}. Their existing acceptance record is kept.`
              : `Existing learners stay on the version they accepted. Only enrollments from now on get v${nextVersion}.`}
          </span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Publish v{nextVersion}</button>
        </>
      }
    >
      {stats && (
        <Field label="What is changing">
          <DiffStats stats={stats} />
        </Field>
      )}

      <Field
        label="Change summary"
        required
        error={summaryError}
        hint="Shown in version history and in the re-consent prompt. Write it for the next person who has to work out why this changed."
      >
        <textarea
          className="textarea"
          value={summary}
          autoFocus
          placeholder="e.g. Refund window widened from 7 to 14 days and the processing charge reduced to ₹1,500 following Learner Success escalations."
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </Field>

      <Field label="Who does this version bind?" required>
        <label className={`radio-card${!retroactive ? ' selected' : ''}`}>
          <input type="radio" checked={!retroactive} onChange={() => setRetroactive(false)} />
          <div>
            <div className="radio-card-title">New enrollments only</div>
            <div className="radio-card-desc">
              Learners who enrol from now on accept v{nextVersion}. Everyone already enrolled stays bound to
              the version they accepted at enrollment, and is not contacted.
            </div>
          </div>
        </label>

        <label className={`radio-card${retroactive ? ' selected' : ''}`}>
          <input type="radio" checked={retroactive} onChange={() => setRetroactive(true)} />
          <div>
            <div className="radio-card-title">Apply retroactively and trigger re-consent</div>
            <div className="radio-card-desc">
              Existing learners are notified, shown what changed, and must accept again. Their original
              acceptance is kept on record; the new acceptance is stored alongside it.
            </div>
          </div>
        </label>
      </Field>

      {retroactive && (
        <div className="impact">
          <div>
            <div className="impact-figure">{fmtNumber(impact)}</div>
          </div>
          <div>
            <div className="impact-label">
              active learners on <strong>{agreement.name}</strong> will be prompted to re-consent.
            </div>
            <div className="impact-note">
              Until a learner accepts v{nextVersion}, they remain bound by the version they previously
              accepted. Progress is tracked in version history and in the acceptance lookup.
            </div>
          </div>
        </div>
      )}

      <Field
        label="Effective from"
        hint="Leave blank to take effect as soon as it is published."
      >
        <input
          className="input"
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          style={{ maxWidth: 220 }}
        />
      </Field>
    </Modal>
  )
}

// The authoring screen.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import {
  agreementStatus, courseName, planName, userName, userById, liveVersion,
  editableDocument, reconsentImpact, isLegalOwner, requestRef, REQUEST_STATUS,
} from '../state/selectors.js'
import { diffDocuments, documentDiffStats, documentHasChanges } from '../lib/doc.js'
import { fmtDateTime, fmtNumber, fmtRelative, fmtVersion } from '../lib/format.js'
import { Badge, StatusBadge, Modal, EmptyState } from '../components/Ui.jsx'
import { DocEditor, AnnexurePanel, useDocEditing } from '../components/DocEditor.jsx'
import { DocView } from '../components/DocView.jsx'
import { DiffView, DiffStats } from '../components/DiffView.jsx'
import { PublishModal } from '../components/PublishModal.jsx'
import { RequestChangeModal } from './ChangeRequests.jsx'

export function Editor() {
  const { state, dispatch, user, navigate, route } = useApp()
  const agreement = state.agreements.find((a) => a.id === route.id)

  if (!agreement) {
    return (
      <div className="page">
        <div className="card">
          <EmptyState
            icon="🔎"
            title="That agreement no longer exists"
            actions={<button className="btn btn-primary" onClick={() => navigate('library')}>Back to the library</button>}
          >
            It may have been removed, or the link may be stale.
          </EmptyState>
        </div>
      </div>
    )
  }

  return <EditorInner key={agreement.id} agreement={agreement} state={state} dispatch={dispatch} user={user} navigate={navigate} route={route} />
}

function EditorInner({ agreement, state, dispatch, user, navigate, route }) {
  const { register, readLatest } = useDocEditing()
  const [doc, setDoc] = useState(() => editableDocument(agreement))
  const [activeAnnexureId, setActiveAnnexureId] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [modal, setModal] = useState(null)

  const canEdit = isLegalOwner(user)
  const status = agreementStatus(agreement)
  const live = liveVersion(agreement)
  const draft = agreement.draft
  const nextVersion = (live?.version || 0) + 1
  const impact = reconsentImpact(agreement)

  const pinned = route.extra ? state.changeRequests.find((r) => r.id === route.extra) : null

  // Structural edits (insert, delete, indent, move, annexure changes) come
  // through here; typing reports separately via onDirty. Both must mark the
  // document unsaved, or the header and the preview will claim nothing changed.
  const updateDoc = useCallback((next) => {
    setDoc(next)
    setDirty(true)
  }, [])

  // After a publish the stored draft is cleared; re-open from the new live
  // version so the surface reflects what was just published.
  useEffect(() => {
    if (!agreement.draft) {
      setDoc(editableDocument(agreement))
      setDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreement.versions.length])

  const awaitingApproval = status.awaitingApproval
  const submittedByMe = draft?.submittedForApproval?.by === user.id
  const canPublish = canEdit && (!awaitingApproval || !!draft?.approvedBy)

  const draftDiff = useMemo(
    () => diffDocuments(live || { blocks: [], annexures: [] }, readLatest(doc)),
    // recomputed on demand when a modal opens; `doc` identity changes on
    // structural edits, which is when it can meaningfully differ.
    [live, doc, readLatest],
  )

  const saveDraft = () => {
    const latest = readLatest(doc)
    setDoc(latest)
    setDirty(false)
    dispatch({ type: 'SAVE_DRAFT', agreementId: agreement.id, blocks: latest.blocks, annexures: latest.annexures })
  }

  const openPublish = () => {
    setDoc(readLatest(doc))
    setModal('publish')
  }

  const doPublish = ({ changeSummary, retroactive, effectiveFrom }) => {
    const latest = readLatest(doc)
    // Make sure the reducer is publishing exactly what is on screen.
    if (dirty || !agreement.draft) {
      dispatch({ type: 'SAVE_DRAFT', agreementId: agreement.id, blocks: latest.blocks, annexures: latest.annexures })
    }
    dispatch({ type: 'PUBLISH', agreementId: agreement.id, changeSummary, retroactive, effectiveFrom })
    if (pinned && (pinned.status === 'open' || pinned.status === 'in_review')) {
      dispatch({
        type: 'UPDATE_REQUEST',
        requestId: pinned.id,
        status: 'actioned',
        resolution: `Addressed in v${nextVersion}. ${changeSummary}`,
      })
    }
    setDirty(false)
    setModal(null)
  }

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <button onClick={() => navigate('library')}>Agreement library</button>
            <span>/</span>
            <span>{courseName(agreement.courseId)}</span>
          </div>
          <h1>{agreement.name}</h1>
          <p>
            <span className="chip">{courseName(agreement.courseId)}</span>{' '}
            <span className="chip">{planName(agreement.planId)}</span>{' '}
            <span className="muted">· {fmtNumber(agreement.cohort.activeLearners)} active learners</span>
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate('history', agreement.id)}>Version history</button>
          {!canEdit && <button className="btn btn-primary" onClick={() => setModal('request')}>Request change</button>}
        </div>
      </div>

      <div className="metastrip">
        <div className="metastrip-item">
          <span className="metastrip-label">Current version</span>
          <span className="metastrip-value">
            {fmtVersion(status.liveVersionNumber)}
            <StatusBadge status={status} />
          </span>
        </div>
        <div className="metastrip-item">
          <span className="metastrip-label">Editing</span>
          <span className="metastrip-value">
            {draft ? `Draft based on ${draft.baseVersion ? `v${draft.baseVersion}` : 'a blank document'}` : `Working copy of ${fmtVersion(status.liveVersionNumber)}`}
            {dirty && <Badge tone="amber">Unsaved changes</Badge>}
          </span>
        </div>
        <div className="metastrip-item">
          <span className="metastrip-label">Last saved</span>
          <span className="metastrip-value">
            {draft?.savedAt ? `${fmtRelative(draft.savedAt)} by ${userName(draft.savedBy)}` : '— not saved yet'}
          </span>
        </div>
        <div className="metastrip-item">
          <span className="metastrip-label">Editing user</span>
          <span className="metastrip-value">{user.name} <span className="muted small">· {user.title}</span></span>
        </div>

        <div className="metastrip-actions">
          <button className="btn" onClick={() => { setDoc(readLatest(doc)); setModal('compare') }}>
            Compare with live
          </button>
          <button className="btn" onClick={() => { setDoc(readLatest(doc)); setModal('preview') }}>Preview</button>
          {canEdit && (
            <>
              <button className="btn" onClick={saveDraft}>Save draft</button>
              <button className="btn btn-primary" onClick={openPublish} disabled={!canPublish}
                title={canPublish ? '' : 'This draft is awaiting approval from another legal owner'}>
                Publish v{nextVersion}
              </button>
            </>
          )}
        </div>
      </div>

      {canEdit && draft && (
        <ApprovalBar
          draft={draft}
          user={user}
          submittedByMe={submittedByMe}
          awaiting={awaitingApproval}
          onSubmit={() => dispatch({ type: 'SUBMIT_FOR_APPROVAL', agreementId: agreement.id })}
          onApprove={() => dispatch({ type: 'APPROVE_DRAFT', agreementId: agreement.id })}
          onDiscard={() => {
            if (window.confirm('Discard this unpublished draft? Published versions are not affected.')) {
              dispatch({ type: 'DISCARD_DRAFT', agreementId: agreement.id })
              navigate('library')
            }
          }}
        />
      )}

      <div className={`editor-layout${pinned ? ' editor-layout-wide' : ''}`}>
        <DocEditor
          doc={doc}
          onChange={updateDoc}
          onDirty={() => setDirty(true)}
          canEdit={canEdit}
          register={register}
          readLatest={readLatest}
          activeAnnexureId={activeAnnexureId}
        />

        <div className="side">
          {pinned && <PinnedRequest request={pinned} onClose={() => navigate('editor', agreement.id)}
            onDone={() => { dispatch({ type: 'UPDATE_REQUEST', requestId: pinned.id, status: 'actioned',
              resolution: `Addressed by ${userName(user.id)} in the draft for v${nextVersion}.` }) }} />}

          <AnnexurePanel
            doc={doc}
            onChange={updateDoc}
            canEdit={canEdit}
            activeId={activeAnnexureId}
            onSelect={setActiveAnnexureId}
            readLatest={readLatest}
          />

          <div className="panel">
            <div className="panel-head"><h4>How versioning works here</h4></div>
            <div className="panel-body">
              <p className="panel-note">
                Editing only ever touches the draft. Publishing appends a new version — it never
                rewrites an existing one, so a learner stays bound to the exact version they accepted
                at enrollment unless you publish retroactively and they accept again.
              </p>
            </div>
          </div>
        </div>
      </div>

      {modal === 'preview' && (
        <PreviewModal
          agreement={agreement}
          doc={readLatest(doc)}
          // Previewing an untouched live version should say so, rather than
          // naming a version number that doesn't exist yet.
          version={draft || dirty ? nextVersion : status.liveVersionNumber}
          isDraft={!!draft || dirty}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'compare' && (
        <Modal
          title="Draft compared with the live version"
          subtitle={live ? `${fmtVersion(live.version)} → working draft` : 'This agreement has never been published.'}
          size="modal-xl"
          onClose={() => setModal(null)}
          footer={<button className="btn" onClick={() => setModal(null)}>Close</button>}
        >
          {documentHasChanges(draftDiff) ? (
            <>
              <div className="mb-16"><DiffStats stats={documentDiffStats(draftDiff)} /></div>
              <DiffView diff={draftDiff} leftLabel={live ? `v${live.version} (live)` : 'Empty'} rightLabel="Working draft" />
            </>
          ) : (
            <EmptyState icon="＝" title="No differences yet">
              The draft is identical to the live version. Make an edit and compare again.
            </EmptyState>
          )}
        </Modal>
      )}

      {modal === 'publish' && (
        <PublishModal
          agreement={agreement}
          diff={draftDiff}
          nextVersion={nextVersion}
          impact={impact}
          prefillSummary={pinned ? `${requestRef(pinned)}: ${pinned.request}` : ''}
          onClose={() => setModal(null)}
          onPublish={doPublish}
        />
      )}

      {modal === 'request' && <RequestChangeModal agreement={agreement} onClose={() => setModal(null)} />}
    </div>
  )
}

function ApprovalBar({ draft, submittedByMe, awaiting, onSubmit, onApprove, onDiscard }) {
  if (draft.approvedBy) {
    return (
      <div className="callout mb-16" style={{ borderLeftColor: 'var(--green)', background: 'var(--green-soft)', borderColor: '#bfe3cf' }}>
        <div className="row">
          <span>
            ✓ Approved by <strong>{userName(draft.approvedBy.by)}</strong> on {fmtDateTime(draft.approvedBy.at)}.
            This draft can be published.
          </span>
          <div className="spacer" />
          <button className="btn btn-sm btn-danger" onClick={onDiscard}>Discard draft</button>
        </div>
      </div>
    )
  }

  if (awaiting) {
    return (
      <div className="callout callout-amber mb-16">
        <div className="row row-wrap">
          <span>
            Submitted for approval by <strong>{userName(draft.submittedForApproval.by)}</strong> on{' '}
            {fmtDateTime(draft.submittedForApproval.at)}.
            {submittedByMe
              ? ' A different legal owner has to approve it before it can be published — switch role in the dev panel to demo this.'
              : ' You can approve it.'}
          </span>
          <div className="spacer" />
          {!submittedByMe && <button className="btn btn-sm btn-primary" onClick={onApprove}>Approve draft</button>}
          <button className="btn btn-sm btn-danger" onClick={onDiscard}>Discard draft</button>
        </div>
      </div>
    )
  }

  return (
    <div className="callout mb-16">
      <div className="row row-wrap">
        <span>
          Unpublished draft, last saved {fmtRelative(draft.savedAt)} by <strong>{userName(draft.savedBy)}</strong>.
          Publish it directly, or send it for a second pair of eyes first.
        </span>
        <div className="spacer" />
        <button className="btn btn-sm" onClick={onSubmit}>Submit for approval</button>
        <button className="btn btn-sm btn-danger" onClick={onDiscard}>Discard draft</button>
      </div>
    </div>
  )
}

function PinnedRequest({ request, onClose, onDone }) {
  const settled = request.status === 'actioned' || request.status === 'rejected'
  return (
    <div className="panel request-pin">
      <div className="panel-head">
        <h4>📌 {requestRef(request)}</h4>
        <Badge tone={REQUEST_STATUS[request.status].tone}>{REQUEST_STATUS[request.status].label}</Badge>
        <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>Unpin</button>
      </div>
      <div className="panel-body">
        <div className="pin-field">
          <div className="pin-label">Section</div>
          <div className="pin-value">{request.section}</div>
        </div>
        <div className="pin-field">
          <div className="pin-label">Requested change</div>
          <div className="pin-value">{request.request}</div>
        </div>
        <div className="pin-field">
          <div className="pin-label">Why</div>
          <div className="pin-value">{request.reason}</div>
        </div>
        <div className="pin-field">
          <div className="pin-label">Raised by</div>
          <div className="pin-value">
            {userName(request.requestedBy)} · {userById(request.requestedBy)?.title}
            <div className="small muted">{fmtDateTime(request.createdAt)}</div>
          </div>
        </div>
        {!settled && (
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={onDone}>
            Mark addressed without publishing
          </button>
        )}
        {request.resolution && <div className="callout small" style={{ marginTop: 10 }}>{request.resolution}</div>}
      </div>
    </div>
  )
}

function PreviewModal({ agreement, doc, version, isDraft, onClose }) {
  return (
    <Modal
      title="Learner preview"
      subtitle={
        isDraft
          ? `How the working draft would appear to a learner — it would publish as v${version}.`
          : `How the live version (v${version}) appears to a learner at the point of enrollment.`
      }
      size="modal-lg"
      onClose={onClose}
      footer={
        <>
          <span className="modal-foot-note">
            Preview only — the learner-side viewer itself is outside this prototype's scope.
          </span>
          <button className="btn btn-primary" onClick={onClose}>Close preview</button>
        </>
      }
    >
      <div className="learner-frame">
        <div className="learner-device">
          <div className="learner-bar">
            <span>📘</span>
            <span>{agreement.name}</span>
          </div>
          <div className="learner-body">
            <DocView doc={doc} />
          </div>
          <div className="learner-scroll-note">scroll to the end to continue</div>
          <div className="learner-accept">
            <label className="learner-check">
              <input type="checkbox" disabled />
              <span>
                I have read and accept the terms of this Agreement, including the refund and
                cancellation terms in Part C.
              </span>
            </label>
            <button className="btn btn-primary" disabled>Accept and continue</button>
            <div className="learner-version-note">
              {isDraft
                ? `A learner accepting this would be bound to v${version} for the lifetime of their enrollment.`
                : `Learners enrolling today accept v${version} and stay bound to it for the lifetime of their enrollment.`}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

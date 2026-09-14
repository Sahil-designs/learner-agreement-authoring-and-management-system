// Reducer, actions and persistence.
//
// Nothing in the app imports from App.jsx -- state lives here and reaches
// screens through AppContext, which keeps the module graph acyclic.
//
// Two invariants this file is responsible for:
//
//   1. `versions` is APPEND-ONLY. No case in this reducer ever reaches into an
//      existing version. That -- not copying blocks around -- is what guarantees
//      a learner's accepted snapshot can never be rewritten by a publish.
//   2. Every mutating case routes through `withAudit`, so it is structurally
//      impossible to change something without leaving an audit trail.

import { seed, USERS } from '../data/seed.js'
import { cloneDocument } from '../lib/doc.js'
import { uid } from '../lib/format.js'

const STORAGE_KEY = 'entri.agreements.demo.v1'
const now = () => new Date().toISOString()

export const initialState = () => ({
  ...seed(),
  currentUserId: 'u_priya',
  toasts: [],
  // Dev-only affordance so the list views' error state is real, reachable code.
  simulateError: false,
})

// --------------------------------------------------------------- persistence

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const saved = JSON.parse(raw)
    if (!saved?.agreements?.length) return initialState()
    return { ...initialState(), ...saved, toasts: [] }
  } catch {
    // Corrupt or unavailable storage must never stop the demo from starting.
    return initialState()
  }
}

export function persistState(state) {
  try {
    const { toasts, ...rest } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {
    /* private browsing / quota -- the demo still works, it just won't survive a refresh */
  }
}

export const clearPersisted = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// --------------------------------------------------------------------- helpers

const userName = (id) => USERS.find((u) => u.id === id)?.name || 'Unknown user'

/** Append one or more audit entries. Every mutating case goes through this. */
function withAudit(state, ...entries) {
  const stamped = entries.filter(Boolean).map((e) => ({
    id: uid('au'),
    at: now(),
    userId: state.currentUserId,
    ...e,
  }))
  return { ...state, audit: [...state.audit, ...stamped] }
}

const mapAgreement = (state, id, fn) => ({
  ...state,
  agreements: state.agreements.map((a) => (a.id === id ? fn(a) : a)),
})

const latestVersion = (ag) => (ag.versions.length ? ag.versions[ag.versions.length - 1] : null)

const pushToast = (state, tone, message) => ({
  ...state,
  toasts: [...state.toasts, { id: uid('t'), tone, message }],
})

const crLabel = (id) => id.toUpperCase().replace('CR_', 'CR-')

// --------------------------------------------------------------------- reducer

export function reducer(state, action) {
  switch (action.type) {
    // ------------------------------------------------------------------ shell
    case 'SET_USER':
      return { ...state, currentUserId: action.userId }

    case 'TOAST':
      return pushToast(state, action.tone || 'success', action.message)

    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }

    case 'SET_SIMULATE_ERROR':
      return { ...state, simulateError: action.value }

    case 'RESET':
      return {
        ...initialState(),
        currentUserId: state.currentUserId,
        toasts: [{ id: uid('t'), tone: 'success', message: 'Demo data reset to the seed file.' }],
      }

    // ----------------------------------------------------------------- drafts
    case 'SAVE_DRAFT': {
      const { agreementId, blocks, annexures } = action
      const ag = state.agreements.find((a) => a.id === agreementId)
      if (!ag) return state
      const base = ag.draft?.baseVersion ?? latestVersion(ag)?.version ?? null
      const next = mapAgreement(state, agreementId, (a) => ({
        ...a,
        draft: {
          ...a.draft,
          blocks,
          annexures,
          baseVersion: base,
          savedAt: now(),
          savedBy: state.currentUserId,
          // Editing after submission sends it back round for approval.
          submittedForApproval: null,
          approvedBy: null,
        },
      }))
      return pushToast(
        withAudit(next, {
          type: 'draft_saved',
          agreementId,
          summary: `Saved draft${base ? ` based on v${base}` : ''}`,
        }),
        'success',
        'Draft saved.',
      )
    }

    case 'DISCARD_DRAFT': {
      const ag = state.agreements.find((a) => a.id === action.agreementId)
      if (!ag?.draft) return state
      const next = mapAgreement(state, action.agreementId, (a) => ({ ...a, draft: null }))
      return pushToast(
        withAudit(next, {
          type: 'draft_discarded',
          agreementId: action.agreementId,
          summary: 'Discarded unpublished draft',
        }),
        'success',
        'Draft discarded.',
      )
    }

    case 'SUBMIT_FOR_APPROVAL': {
      const ag = state.agreements.find((a) => a.id === action.agreementId)
      if (!ag?.draft) return state
      const next = mapAgreement(state, action.agreementId, (a) => ({
        ...a,
        draft: { ...a.draft, submittedForApproval: { by: state.currentUserId, at: now() }, approvedBy: null },
      }))
      return pushToast(
        withAudit(next, {
          type: 'draft_submitted',
          agreementId: action.agreementId,
          summary: 'Submitted draft for approval',
        }),
        'success',
        'Draft submitted for approval.',
      )
    }

    case 'APPROVE_DRAFT': {
      const ag = state.agreements.find((a) => a.id === action.agreementId)
      if (!ag?.draft?.submittedForApproval) return state
      const next = mapAgreement(state, action.agreementId, (a) => ({
        ...a,
        draft: { ...a.draft, approvedBy: { by: state.currentUserId, at: now() } },
      }))
      return pushToast(
        withAudit(next, {
          type: 'draft_approved',
          agreementId: action.agreementId,
          summary: `Approved draft submitted by ${userName(ag.draft.submittedForApproval.by)}`,
        }),
        'success',
        'Draft approved. It can now be published.',
      )
    }

    // ---------------------------------------------------------------- publish
    //
    // One fat case rather than four dispatches, so the new version, the cleared
    // draft, the re-consent record and the audit trail can never drift apart.
    case 'PUBLISH': {
      const { agreementId, changeSummary, retroactive, effectiveFrom } = action
      const ag = state.agreements.find((a) => a.id === agreementId)
      if (!ag?.draft) return state

      const versionNumber = (latestVersion(ag)?.version || 0) + 1
      const prompted = retroactive ? ag.cohort.activeLearners : 0
      const newVersion = {
        version: versionNumber,
        publishedAt: now(),
        publishedBy: state.currentUserId,
        effectiveFrom: effectiveFrom || now(),
        changeSummary,
        retroactive: !!retroactive,
        reconsent: retroactive ? { prompted, reAccepted: 0, pending: prompted } : null,
        // The one and only place a draft becomes a frozen version.
        ...cloneDocument(ag.draft),
      }

      const next = mapAgreement(state, agreementId, (a) => ({
        ...a,
        versions: [...a.versions, newVersion], // append-only, never spliced
        draft: null,
      }))

      return pushToast(
        withAudit(
          next,
          {
            type: 'version_published',
            agreementId,
            version: versionNumber,
            summary: `Published v${versionNumber} — ${changeSummary}`,
          },
          retroactive && {
            type: 'reconsent_triggered',
            agreementId,
            version: versionNumber,
            summary: `Re-consent triggered for ${prompted.toLocaleString('en-IN')} active learners on publication of v${versionNumber}`,
          },
        ),
        'success',
        retroactive
          ? `Published v${versionNumber}. ${prompted.toLocaleString('en-IN')} learners will be prompted to re-consent.`
          : `Published v${versionNumber}. Existing learners keep the version they accepted.`,
      )
    }

    // ------------------------------------------------------------- agreements
    case 'CREATE_AGREEMENT': {
      const { name, courseId, planId, sourceAgreementId } = action
      const source = sourceAgreementId ? state.agreements.find((a) => a.id === sourceAgreementId) : null
      const sourceLive = source ? latestVersion(source) : null
      const sourceDoc = source ? sourceLive || source.draft : null

      const agreement = {
        id: uid('ag'),
        name,
        courseId,
        planId,
        createdAt: now(),
        createdBy: state.currentUserId,
        cohort: { activeLearners: 0, enrolledLast30: 0 },
        versions: [],
        draft: {
          ...(sourceDoc ? cloneDocument(sourceDoc) : { blocks: [], annexures: [] }),
          baseVersion: null,
          savedAt: now(),
          savedBy: state.currentUserId,
          submittedForApproval: null,
          approvedBy: null,
          duplicatedFrom: source
            ? { id: source.id, name: source.name, version: sourceLive?.version ?? null }
            : null,
        },
      }

      const next = { ...state, agreements: [...state.agreements, agreement] }
      return pushToast(
        withAudit(next, {
          type: 'agreement_created',
          agreementId: agreement.id,
          summary: source
            ? `Created agreement “${name}” by duplicating “${source.name}”${sourceLive ? ` v${sourceLive.version}` : ' draft'}`
            : `Created agreement “${name}” from a blank document`,
        }),
        'success',
        source ? `“${name}” created from “${source.name}”.` : `“${name}” created.`,
      )
    }

    // -------------------------------------------------------- change requests
    case 'SUBMIT_REQUEST': {
      const request = {
        id: uid('cr'),
        reference: `CR-${Math.floor(Math.random() * 400 + 500)}`,
        agreementId: action.agreementId,
        section: action.section,
        request: action.request,
        reason: action.reason,
        priority: action.priority,
        requestedBy: state.currentUserId,
        createdAt: now(),
        status: 'open',
        actionedBy: null,
        actionedAt: null,
        resolution: null,
      }
      const next = { ...state, changeRequests: [request, ...state.changeRequests] }
      return pushToast(
        withAudit(next, {
          type: 'change_request_raised',
          agreementId: action.agreementId,
          requestId: request.id,
          summary: `Raised change request ${request.reference} — ${action.section}`,
        }),
        'success',
        'Change request submitted. It is now in the legal team’s queue.',
      )
    }

    case 'UPDATE_REQUEST': {
      const { requestId, status, resolution } = action
      const req = state.changeRequests.find((r) => r.id === requestId)
      if (!req) return state
      const settled = status === 'actioned' || status === 'rejected'
      const next = {
        ...state,
        changeRequests: state.changeRequests.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status,
                resolution: resolution ?? r.resolution,
                actionedBy: settled ? state.currentUserId : null,
                actionedAt: settled ? now() : null,
              }
            : r,
        ),
      }
      const label = { in_review: 'Moved to in review', actioned: 'Actioned', rejected: 'Rejected', open: 'Reopened' }[status]
      return pushToast(
        withAudit(next, {
          type: settled ? 'change_request_actioned' : 'change_request_updated',
          agreementId: req.agreementId,
          requestId,
          summary: `${label} change request ${req.reference || crLabel(requestId)}`,
        }),
        'success',
        `${label}.`,
      )
    }

    default:
      return state
  }
}

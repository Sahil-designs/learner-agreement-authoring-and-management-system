// Derived reads. Anything computed from state lives here so that the library,
// the editor header, the status filter and the audit log cannot disagree about
// what "Pending approval" means.

import { COURSES, PLANS, USERS } from '../data/seed.js'
import { cloneDocument, docText } from '../lib/doc.js'

export const courseById = (id) => COURSES.find((c) => c.id === id)
export const planById = (id) => PLANS.find((p) => p.id === id)
export const userById = (id) => USERS.find((u) => u.id === id)

export const courseName = (id) => courseById(id)?.name || '—'
export const planName = (id) => planById(id)?.name || '—'
export const userName = (id) => userById(id)?.name || '—'

export const isLegalOwner = (user) => user?.role === 'legal_owner'

/** The currently live (most recently published) version, or null. */
export const liveVersion = (ag) => (ag?.versions?.length ? ag.versions[ag.versions.length - 1] : null)

export const versionByNumber = (ag, n) => ag?.versions?.find((v) => v.version === n) || null

/**
 * One definition of status, used everywhere.
 *
 * An agreement can be live AND carry an unpublished draft, so the primary
 * status and the draft indicator are reported separately rather than being
 * squeezed into one badge.
 */
export function agreementStatus(ag) {
  const live = liveVersion(ag)
  const draft = ag?.draft || null
  const awaitingApproval = !!draft?.submittedForApproval && !draft?.approvedBy

  const key = awaitingApproval ? 'pending_approval' : live ? 'published' : 'draft'
  return {
    key,
    label: { pending_approval: 'Pending approval', published: 'Published', draft: 'Draft' }[key],
    live,
    liveVersionNumber: live?.version || null,
    hasDraft: !!draft,
    awaitingApproval,
    approved: !!draft?.approvedBy,
    // Shown next to a Published badge when work is in flight.
    draftNote: live && draft ? `Unpublished draft based on v${draft.baseVersion ?? live.version}` : null,
  }
}

export const STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
]

/** Who touched it last, whether that was a publish or a draft save. */
export function lastEdited(ag) {
  const live = liveVersion(ag)
  const draft = ag?.draft
  if (draft?.savedAt && (!live || draft.savedAt > live.publishedAt)) {
    return { at: draft.savedAt, by: draft.savedBy, what: 'draft saved' }
  }
  if (live) return { at: live.publishedAt, by: live.publishedBy, what: `published v${live.version}` }
  return { at: ag?.createdAt, by: ag?.createdBy, what: 'created' }
}

/**
 * The document the editor should open: the working draft if there is one,
 * otherwise a fresh deep copy of the live version. The copy is what stops an
 * edit from reaching into a published version.
 */
export function editableDocument(ag) {
  if (ag?.draft) return { blocks: ag.draft.blocks, annexures: ag.draft.annexures, baseVersion: ag.draft.baseVersion }
  const live = liveVersion(ag)
  return { ...cloneDocument(live || { blocks: [], annexures: [] }), baseVersion: live?.version ?? null }
}

/** What publishing retroactively would cost. Computed, never hardcoded. */
export const reconsentImpact = (ag) => ag?.cohort?.activeLearners || 0

// ------------------------------------------------------------------ filtering

export function filterAgreements(agreements, { course, plan, status, query }) {
  const q = (query || '').trim().toLowerCase()
  return agreements.filter((ag) => {
    if (course && ag.courseId !== course) return false
    if (plan && ag.planId !== plan) return false
    if (status && agreementStatus(ag).key !== status) return false
    if (q) {
      const live = liveVersion(ag)
      const haystack = [
        ag.name,
        courseName(ag.courseId),
        planName(ag.planId),
        docText(live?.blocks || ag.draft?.blocks || []),
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

/**
 * Course x plan coverage. The flat library answers "what exists"; this answers
 * "which combinations have no agreement yet", which is the question that
 * motivated duplication in the first place.
 */
export function coverageMatrix(agreements) {
  return COURSES.map((course) => ({
    course,
    cells: PLANS.map((plan) => ({
      plan,
      agreement: agreements.find((a) => a.courseId === course.id && a.planId === plan.id) || null,
    })),
  }))
}

export const coverageStats = (agreements) => {
  const total = COURSES.length * PLANS.length
  const covered = coverageMatrix(agreements).flatMap((r) => r.cells).filter((c) => c.agreement).length
  return { total, covered, gaps: total - covered }
}

// ---------------------------------------------------------------- acceptances

/**
 * Every acceptance a learner holds, grouped by agreement, newest first, with
 * the original enrollment acceptance preserved alongside any re-consent.
 */
export function learnerRecord(state, learnerId) {
  const rows = state.acceptances.filter(
    (a) => a.learnerId.toLowerCase() === String(learnerId || '').trim().toLowerCase(),
  )
  if (!rows.length) return null

  const byAgreement = new Map()
  for (const row of rows) {
    if (!byAgreement.has(row.agreementId)) byAgreement.set(row.agreementId, [])
    byAgreement.get(row.agreementId).push(row)
  }

  const enrollments = [...byAgreement.entries()].map(([agreementId, list]) => {
    const ag = state.agreements.find((a) => a.id === agreementId)
    const sorted = [...list].sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt))
    const current = sorted[0]
    const live = liveVersion(ag)
    const behind = live ? current.version < live.version : false
    return {
      agreement: ag,
      agreementId,
      acceptances: sorted,
      current,
      liveVersionNumber: live?.version || null,
      behind,
      // Only a retroactive publish actually asks an existing learner to act.
      pendingReconsent: behind && !!live?.retroactive,
    }
  })

  return { learnerId: rows[0].learnerId, learnerName: rows[0].learnerName, enrollments }
}

export const allLearners = (state) => {
  const seen = new Map()
  for (const a of state.acceptances) if (!seen.has(a.learnerId)) seen.set(a.learnerId, a.learnerName)
  return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id))
}

// ------------------------------------------------------------------- requests

export const REQUEST_STATUS = {
  open: { label: 'Open', tone: 'amber' },
  in_review: { label: 'In review', tone: 'blue' },
  actioned: { label: 'Actioned', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'grey' },
}

export const requestRef = (r) => r.reference || r.id.toUpperCase().replace('CR_', 'CR-')

export const openRequestsFor = (state, agreementId) =>
  state.changeRequests.filter(
    (r) => r.agreementId === agreementId && (r.status === 'open' || r.status === 'in_review'),
  )

// ----------------------------------------------------------------- audit log

export const AUDIT_TYPES = {
  agreement_created: 'Agreement created',
  draft_saved: 'Draft saved',
  draft_discarded: 'Draft discarded',
  draft_submitted: 'Submitted for approval',
  draft_approved: 'Draft approved',
  version_published: 'Version published',
  reconsent_triggered: 'Re-consent triggered',
  change_request_raised: 'Change request raised',
  change_request_updated: 'Change request updated',
  change_request_actioned: 'Change request actioned',
}

export function filterAudit(audit, { user, agreement, type, from, to, query }) {
  const q = (query || '').trim().toLowerCase()
  return [...audit]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((e) => {
      if (user && e.userId !== user) return false
      if (agreement && e.agreementId !== agreement) return false
      if (type && e.type !== type) return false
      if (from && e.at < from) return false
      // `to` is a date; include the whole of that day.
      if (to && e.at > `${to}T23:59:59.999Z`) return false
      if (q && !e.summary.toLowerCase().includes(q)) return false
      return true
    })
}

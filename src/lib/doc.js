// The document model.
//
// A document is an ordered array of typed blocks. The critical design decision:
// clause NUMBERS ARE NEVER STORED. They are derived on every render by walking
// the array. That is why inserting, deleting, indenting or reordering a clause
// renumbers the whole document instantly and correctly -- there is nothing to
// keep in sync, because there is nothing stored.

import { uid } from './format.js'

// ---------------------------------------------------------------- constructors
// Block ids are authored explicitly in the seed file so that an unchanged clause
// keeps the same id across v1/v2/v3. The diff relies on that to tell "this clause
// was edited" apart from "this clause was deleted and a different one added".

export const h = (id, html) => ({ id, type: 'heading', html })
export const c = (id, level, html) => ({ id, type: 'clause', level, html })
export const p = (id, html) => ({ id, type: 'para', html })
export const tbl = (id, rows) => ({ id, type: 'table', rows })

export const newBlock = (type = 'clause', level = 1) =>
  type === 'table'
    ? { id: uid('b'), type, rows: [['Heading', 'Heading'], ['', '']] }
    : { id: uid('b'), type, level, html: '' }

export const MAX_LEVEL = 3

// ------------------------------------------------------------------- numbering

/**
 * Returns the blocks with a derived `number` ("1.", "1.1", "1.1.1") on each
 * clause and `null` on everything else. Pure -- call it as often as you like.
 */
export function numberBlocks(blocks) {
  const counters = [0, 0, 0]
  return blocks.map((b) => {
    if (b.type !== 'clause') return { ...b, number: null }
    const lvl = Math.min(Math.max(b.level || 1, 1), MAX_LEVEL)
    // A nested clause with no parent yet (badly authored doc, or mid-edit)
    // still needs a sensible number rather than "0.1".
    for (let i = 0; i < lvl - 1; i++) if (counters[i] === 0) counters[i] = 1
    counters[lvl - 1] += 1
    for (let i = lvl; i < MAX_LEVEL; i++) counters[i] = 0
    const number = counters.slice(0, lvl).join('.') + (lvl === 1 ? '.' : '')
    return { ...b, number }
  })
}

// --------------------------------------------------------------------- text

const TAG = /<[^>]*>/g
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

/** Strip inline markup down to plain text -- used for diffing and searching. */
export function plainText(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(TAG, '')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim()
}

/** The comparable text of any block, tables included. */
export function blockText(b) {
  if (!b) return ''
  if (b.type === 'table') return (b.rows || []).map((r) => r.map(plainText).join(' | ')).join('\n')
  return plainText(b.html)
}

/** Whole-document plain text, for the library search box. */
export const docText = (blocks = []) => blocks.map(blockText).join('\n')

export const BLOCK_LABEL = {
  heading: 'Section heading',
  clause: 'Clause',
  para: 'Paragraph',
  table: 'Table',
}

/** Human label for a block in diffs and change-request pickers: "Clause 3.2". */
export function blockLabel(b) {
  if (b.type === 'clause' && b.number) return `Clause ${b.number.replace(/\.$/, '')}`
  if (b.type === 'heading') return plainText(b.html).slice(0, 60) || 'Section heading'
  return BLOCK_LABEL[b.type] || 'Block'
}

/** Section headings of a document -- powers the "which section?" change-request field. */
export const sectionsOf = (blocks = []) =>
  numberBlocks(blocks)
    .filter((b) => b.type === 'heading' || (b.type === 'clause' && b.level === 1))
    .map((b) => (b.type === 'heading' ? plainText(b.html) : `${b.number} ${plainText(b.html).slice(0, 60)}`))
    .filter(Boolean)

// ---------------------------------------------------------------------- diff

/**
 * Generic longest-common-subsequence. Returns a flat op list of
 * {type:'same'|'del'|'add'}. Used twice: once over blocks (keyed by id) and
 * once over words inside a changed block.
 */
function lcsOps(a, b, key) {
  const n = a.length
  const m = b.length
  // dp[i][j] = LCS length of a[i..] and b[j..]
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) ops.push({ type: 'same', a: a[i], b: b[j], ai: i, bi: j }), i++, j++
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: 'del', a: a[i], ai: i }), i++
    else ops.push({ type: 'add', b: b[j], bi: j }), j++
  }
  while (i < n) ops.push({ type: 'del', a: a[i], ai: i }), i++
  while (j < m) ops.push({ type: 'add', b: b[j], bi: j }), j++
  return ops
}

const words = (t) => (t ? t.split(/\s+/).filter(Boolean) : [])

/**
 * Word-level diff between two strings.
 * Returns [{type:'same'|'del'|'add', text}] with runs merged so the rendered
 * output is a handful of spans rather than one span per word.
 */
export function wordDiff(aText, bText) {
  const ops = lcsOps(words(aText), words(bText), (x) => x)
  const out = []
  for (const op of ops) {
    const text = op.type === 'add' ? op.b : op.a
    const last = out[out.length - 1]
    if (last && last.type === op.type) last.text += ` ${text}`
    else out.push({ type: op.type, text })
  }
  return out
}

/**
 * Diff two documents.
 *
 * Blocks are matched by stable id, so an edit to clause 3.2 reads as an edit
 * rather than a delete plus an unrelated insert. A block whose id survives but
 * whose text changed becomes a 'changed' row carrying a word-level diff. A block
 * that LCS reports as both deleted and added (because it moved) is relabelled
 * 'moved' so the diff does not claim text was rewritten when it only shifted.
 */
export function diffDocs(aBlocks = [], bBlocks = []) {
  const A = numberBlocks(aBlocks)
  const B = numberBlocks(bBlocks)
  const ops = lcsOps(A, B, (x) => x.id)

  const delIds = new Set(ops.filter((o) => o.type === 'del').map((o) => o.a.id))
  const addIds = new Set(ops.filter((o) => o.type === 'add').map((o) => o.b.id))
  const movedIds = new Set([...delIds].filter((id) => addIds.has(id)))

  const rows = []
  for (const op of ops) {
    if (op.type === 'same') {
      const at = blockText(op.a)
      const bt = blockText(op.b)
      if (at !== bt) {
        rows.push({ type: 'changed', left: op.a, right: op.b, words: wordDiff(at, bt) })
      } else if (op.a.number !== op.b.number || op.a.level !== op.b.level) {
        // Same words, but the clause was indented/outdented or shifted by an
        // edit above it. An html-only diff would call this "unchanged" while the
        // room can plainly see the number changed.
        rows.push({ type: 'renumbered', left: op.a, right: op.b })
      } else {
        rows.push({ type: 'same', left: op.a, right: op.b })
      }
    } else if (op.type === 'del') {
      const moved = movedIds.has(op.a.id)
      // Render a move once, on the side it moved to.
      if (!moved) rows.push({ type: 'removed', left: op.a, right: null })
    } else {
      const moved = movedIds.has(op.b.id)
      rows.push({ type: moved ? 'moved' : 'added', left: moved ? op.b : null, right: op.b })
    }
  }
  return rows
}

/** Headline counts for the diff summary strip. */
export function diffStats(rows) {
  const s = { added: 0, removed: 0, changed: 0, moved: 0, renumbered: 0, unchanged: 0 }
  for (const r of rows) {
    if (r.type === 'added') s.added++
    else if (r.type === 'removed') s.removed++
    else if (r.type === 'changed') s.changed++
    else if (r.type === 'moved') s.moved++
    else if (r.type === 'renumbered') s.renumbered++
    else s.unchanged++
  }
  return s
}

export const hasChanges = (rows) => rows.some((r) => r.type !== 'same')

/** Deep copy of a document -- used when publishing freezes a snapshot. */
export const freeze = (blocks = []) =>
  blocks.map((b) => (b.type === 'table' ? { ...b, rows: b.rows.map((r) => [...r]) } : { ...b }))

export const freezeAnnexures = (annexures = []) =>
  annexures.map((a) => ({ ...a, blocks: freeze(a.blocks) }))

// ------------------------------------------------- authoring later versions
//
// v2 and v3 of a seeded agreement are built by applying a named list of edits
// to v1, rather than by hand-retyping the whole document with hand-copied ids.
// Two payoffs: block ids are correct by construction (so the diff is provably
// genuine rather than accidentally showing every clause as rewritten), and the
// seed file itself becomes a readable record of what legal actually changed.

export const replaceHtml = (id, html) => (blocks) =>
  blocks.map((b) => (b.id === id ? { ...b, html } : b))

export const setLevel = (id, level) => (blocks) =>
  blocks.map((b) => (b.id === id ? { ...b, level } : b))

export const removeBlock = (id) => (blocks) => blocks.filter((b) => b.id !== id)

export const insertAfter = (id, ...added) => (blocks) => {
  const i = blocks.findIndex((b) => b.id === id)
  if (i === -1) throw new Error(`insertAfter: no block "${id}"`)
  return [...blocks.slice(0, i + 1), ...added, ...blocks.slice(i + 1)]
}

export const insertBefore = (id, ...added) => (blocks) => {
  const i = blocks.findIndex((b) => b.id === id)
  if (i === -1) throw new Error(`insertBefore: no block "${id}"`)
  return [...blocks.slice(0, i), ...added, ...blocks.slice(i)]
}

/** Move an existing block so that it sits immediately after `targetId`. */
export const moveAfter = (id, targetId) => (blocks) => {
  const block = blocks.find((b) => b.id === id)
  if (!block) throw new Error(`moveAfter: no block "${id}"`)
  const rest = blocks.filter((b) => b.id !== id)
  const i = rest.findIndex((b) => b.id === targetId)
  if (i === -1) throw new Error(`moveAfter: no target "${targetId}"`)
  return [...rest.slice(0, i + 1), block, ...rest.slice(i + 1)]
}

export const replaceRows = (id, rows) => (blocks) =>
  blocks.map((b) => (b.id === id ? { ...b, rows } : b))

/** Apply edits left to right. Each edit throws if its target id is missing. */
export const applyEdits = (blocks, edits) => edits.reduce((acc, edit) => edit(acc), blocks)

// --------------------------------------------------------- document-level diff

/**
 * Diff two whole documents -- body blocks plus annexures. Annexures are matched
 * by id so "we added Annexure C, the fee schedule" renders as an addition and an
 * edit inside Annexure A renders as an edit.
 *
 * Used for both version-to-version comparison and the draft-vs-live preview,
 * so the same DiffView component serves both.
 */
export function diffDocuments(a = {}, b = {}) {
  const body = diffDocs(a.blocks || [], b.blocks || [])
  const aAnx = a.annexures || []
  const bAnx = b.annexures || []
  const ops = lcsOps(aAnx, bAnx, (x) => x.id)

  const annexures = ops.map((op) => {
    if (op.type === 'del') {
      return { id: op.a.id, title: op.a.title, status: 'removed', rows: diffDocs(op.a.blocks, []) }
    }
    if (op.type === 'add') {
      return { id: op.b.id, title: op.b.title, status: 'added', rows: diffDocs([], op.b.blocks) }
    }
    const rows = diffDocs(op.a.blocks, op.b.blocks)
    const retitled = op.a.title !== op.b.title
    return {
      id: op.b.id,
      title: op.b.title,
      previousTitle: retitled ? op.a.title : null,
      status: hasChanges(rows) || retitled ? 'changed' : 'same',
      rows,
    }
  })

  return { body, annexures }
}

/** Combined counts across body and annexures, for the summary strip. */
export function documentDiffStats(diff) {
  const total = diffStats(diff.body)
  for (const anx of diff.annexures) {
    if (anx.status === 'added') total.added++
    else if (anx.status === 'removed') total.removed++
    else {
      const s = diffStats(anx.rows)
      total.added += s.added
      total.removed += s.removed
      total.changed += s.changed
      total.moved += s.moved
    }
  }
  return total
}

export const documentHasChanges = (diff) =>
  hasChanges(diff.body) || diff.annexures.some((a) => a.status !== 'same')

/**
 * Deep copy of a whole document. Called at exactly two boundaries: opening a
 * draft from a published version, and freezing a draft into a new version.
 * Everything between those two points works on the draft's own objects, so a
 * published version can never be mutated by an edit.
 */
export const cloneDocument = (doc) => ({
  blocks: freeze(doc?.blocks || []),
  annexures: freezeAnnexures(doc?.annexures || []),
})

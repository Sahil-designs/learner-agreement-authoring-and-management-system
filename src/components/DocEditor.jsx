// Editor surface + annexure panel.
//
// All structural operations (insert, delete, indent, outdent, move) are driven
// by visible buttons in a hover gutter, with keyboard shortcuts as a bonus.
// That is deliberate: the moment the demo is built around is "delete clause 4.2
// and watch the whole document renumber", and a button click is something the
// room can actually see happen. A Backspace keypress is invisible from the
// third row.

import { useCallback, useEffect, useRef, useState } from 'react'
import { numberBlocks, newBlock, MAX_LEVEL } from '../lib/doc.js'
import { uid } from '../lib/format.js'
import { Editable, EditorToolbar, caretAtStart } from './BlockEditor.jsx'

// ------------------------------------------------------------ live html reads

const hydrateBlocks = (blocks, map) =>
  blocks.map((b) => {
    if (b.type === 'table') {
      return {
        ...b,
        rows: b.rows.map((row, r) => row.map((cell, c) => map.get(`${b.id}:${r}:${c}`)?.() ?? cell)),
      }
    }
    const get = map.get(b.id)
    return get ? { ...b, html: get() } : b
  })

/**
 * Registry of live contentEditable readers.
 *
 * `readLatest(doc)` pulls the current html straight out of the DOM, so a
 * structural change or a save never loses the sentence someone is mid-way
 * through typing.
 */
export function useDocEditing() {
  const registry = useRef(new Map())

  const register = useCallback((id, getter) => {
    if (getter) registry.current.set(id, getter)
    else registry.current.delete(id)
  }, [])

  const readLatest = useCallback(
    (doc) => ({
      blocks: hydrateBlocks(doc.blocks || [], registry.current),
      annexures: (doc.annexures || []).map((a) => ({
        ...a,
        blocks: hydrateBlocks(a.blocks || [], registry.current),
      })),
    }),
    [],
  )

  return { register, readLatest }
}

// ------------------------------------------------------------------- surface

const PLACEHOLDER = {
  heading: 'Section heading, e.g. PART C: REFUND AND CANCELLATION',
  clause: 'Clause text…',
  para: 'Paragraph text…',
}

export function DocEditor({ doc, onChange, onDirty, canEdit, register, readLatest, activeAnnexureId }) {
  const surfaceRef = useRef(null)
  const [focusedId, setFocusedId] = useState(null)
  const [flash, setFlash] = useState(() => new Set())
  const prevNumbers = useRef(null)

  const annexure = activeAnnexureId ? (doc.annexures || []).find((a) => a.id === activeAnnexureId) : null
  const blocks = annexure ? annexure.blocks : doc.blocks
  const numbered = numberBlocks(blocks || [])

  /** Write a new block list back into whichever document is being edited. */
  const setBlocks = useCallback(
    (fn) => {
      const latest = readLatest(doc)
      if (activeAnnexureId) {
        const target = latest.annexures.find((a) => a.id === activeAnnexureId)
        const nextBlocks = fn(target.blocks)
        onChange({
          ...latest,
          annexures: latest.annexures.map((a) => (a.id === activeAnnexureId ? { ...a, blocks: nextBlocks } : a)),
        })
      } else {
        onChange({ ...latest, blocks: fn(latest.blocks) })
      }
    },
    [doc, onChange, readLatest, activeAnnexureId],
  )

  // Flash any clause whose number just changed, so the renumber is visible from
  // across the room rather than being something the presenter has to narrate.
  useEffect(() => {
    const current = new Map(numbered.filter((b) => b.number).map((b) => [b.id, b.number]))
    const prev = prevNumbers.current
    prevNumbers.current = current
    if (!prev) return // don't flash the whole document on first paint
    const changed = [...current].filter(([id, n]) => prev.has(id) && prev.get(id) !== n).map(([id]) => id)
    if (!changed.length) return
    setFlash(new Set(changed))
    const t = setTimeout(() => setFlash(new Set()), 950)
    return () => clearTimeout(t)
  })

  // ------------------------------------------------------------- operations

  const insertAt = (index, type = 'clause', level = 1) => {
    const block = newBlock(type, level)
    setBlocks((bs) => [...bs.slice(0, index), block, ...bs.slice(index)])
    // Focus the new block once React has committed it.
    setTimeout(() => {
      const el = surfaceRef.current?.querySelector(`[data-block="${block.id}"] .editable`)
      el?.focus()
    }, 0)
  }

  const insertAfterFocused = (type, level) => {
    const i = blocks.findIndex((b) => b.id === focusedId)
    const at = i === -1 ? blocks.length : i + 1
    const lvl = level ?? (blocks[i]?.level || 1)
    insertAt(at, type, lvl)
  }

  const remove = (id) => setBlocks((bs) => bs.filter((b) => b.id !== id))

  const setLevelBy = (id, delta) =>
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === id && b.type === 'clause'
          ? { ...b, level: Math.min(MAX_LEVEL, Math.max(1, (b.level || 1) + delta)) }
          : b,
      ),
    )

  const move = (id, delta) =>
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id)
      const j = i + delta
      if (i === -1 || j < 0 || j >= bs.length) return bs
      const next = [...bs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const addTableRow = (id) =>
    setBlocks((bs) =>
      bs.map((b) => (b.id === id ? { ...b, rows: [...b.rows, b.rows[0].map(() => '')] } : b)),
    )

  const removeTableRow = (id) =>
    setBlocks((bs) =>
      bs.map((b) => (b.id === id && b.rows.length > 2 ? { ...b, rows: b.rows.slice(0, -1) } : b)),
    )

  const onKey = (e, id, el) => {
    if (!canEdit) return
    const index = blocks.findIndex((b) => b.id === id)
    const block = blocks[index]

    if (e.key === 'Enter' && !e.shiftKey) {
      // Always preventDefault -- contentEditable would otherwise inject its own
      // <div>/<br> and quietly corrupt the block model.
      e.preventDefault()
      insertAt(index + 1, block.type === 'heading' ? 'clause' : block.type, block.level || 1)
      return
    }
    if (e.key === 'Tab' && block.type === 'clause') {
      // Must preventDefault or focus escapes the editor entirely, which is very
      // visible on a projector.
      e.preventDefault()
      setLevelBy(id, e.shiftKey ? -1 : 1)
      return
    }
    if (e.key === 'Backspace' && blocks.length > 1 && caretAtStart(el) && !el.textContent.trim()) {
      e.preventDefault()
      const prev = blocks[index - 1]
      remove(id)
      if (prev) {
        setTimeout(() => {
          const node = surfaceRef.current?.querySelector(`[data-block="${prev.id}"] .editable`)
          node?.focus()
        }, 0)
      }
    }
  }

  return (
    <div className="card">
      <EditorToolbar canEdit={canEdit} surfaceRef={surfaceRef} onInsert={insertAfterFocused} />

      {!canEdit && (
        <div className="editor-readonly-note">
          <span>
            Read-only. Your role can view every agreement but cannot change content. Use
            <strong>Request change</strong> to send an edit to the legal team.
          </span>
        </div>
      )}

      {annexure && (
        <div className="editor-readonly-note" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderColor: '#c9d6f8' }}>
          <span>Editing annexure: <strong>{annexure.title}</strong></span>
        </div>
      )}

      <div
        className="editor-surface"
        ref={surfaceRef}
        // Typing deliberately never touches React state, so this is how the
        // header learns there are unsaved changes. Setting an already-true
        // boolean is a no-op re-render, so it costs nothing per keystroke.
        onInput={() => onDirty?.()}
      >
        {!numbered.length && (
          <p className="doc-empty-line" style={{ marginBottom: 16 }}>
            This document is empty. Use the toolbar above to add a heading or the first clause.
          </p>
        )}

        <div className="doc">
          {numbered.map((b, i) => (
            <div key={b.id}>
              {canEdit && (
                <div className="blockrow-insert">
                  <button onClick={() => insertAt(i, 'clause', b.level || 1)} title="Insert a clause here">
                    insert clause
                  </button>
                </div>
              )}
              <BlockRow
                block={b}
                index={i}
                total={numbered.length}
                canEdit={canEdit}
                flash={flash.has(b.id)}
                register={register}
                onFocus={setFocusedId}
                onKey={onKey}
                onRemove={() => remove(b.id)}
                onMove={(d) => move(b.id, d)}
                onLevel={(d) => setLevelBy(b.id, d)}
                onAddRow={() => addTableRow(b.id)}
                onRemoveRow={() => removeTableRow(b.id)}
              />
            </div>
          ))}

          {canEdit && numbered.length > 0 && (
            <div className="blockrow-insert" style={{ marginTop: 6 }}>
              <button onClick={() => insertAt(numbered.length, 'clause', 1)}>insert clause at end</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BlockRow({ block, index, total, canEdit, flash, register, onFocus, onKey, onRemove, onMove, onLevel, onAddRow, onRemoveRow }) {
  const gutter = canEdit && (
    <div className="blockrow-gutter">
      <button className="gbtn" onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
      <button className="gbtn" onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">↓</button>
      {block.type === 'clause' && (
        <>
          <button className="gbtn" onClick={() => onLevel(-1)} disabled={(block.level || 1) <= 1} title="Outdent">⇤</button>
          <button className="gbtn" onClick={() => onLevel(1)} disabled={(block.level || 1) >= MAX_LEVEL} title="Indent">⇥</button>
        </>
      )}
      <button className="gbtn gbtn-danger" onClick={onRemove} title="Delete this block">✕</button>
    </div>
  )

  if (block.type === 'table') {
    return (
      <div className="blockrow" data-block={block.id}>
        {gutter}
        <table className="doc-table">
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const Cell = r === 0 ? 'th' : 'td'
                  return (
                    <Cell key={c}>
                      <Editable
                        id={`${block.id}:${r}:${c}`}
                        html={cell}
                        canEdit={canEdit}
                        register={register}
                        placeholder={r === 0 ? 'Column' : '-'}
                      />
                    </Cell>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <div className="row" style={{ marginTop: -8, marginBottom: 14 }}>
            <button className="btn btn-sm btn-ghost" onClick={onAddRow}>+ Row</button>
            <button className="btn btn-sm btn-ghost" onClick={onRemoveRow} disabled={block.rows.length <= 2}>− Row</button>
          </div>
        )}
      </div>
    )
  }

  if (block.type === 'heading') {
    return (
      <div className="blockrow" data-block={block.id}>
        {gutter}
        <h3 className="doc-heading">
          <Editable
            id={block.id}
            html={block.html}
            canEdit={canEdit}
            register={register}
            onFocus={onFocus}
            onKey={onKey}
            placeholder={PLACEHOLDER.heading}
          />
        </h3>
      </div>
    )
  }

  if (block.type === 'clause') {
    return (
      <div className="blockrow" data-block={block.id}>
        {gutter}
        <div className={`doc-clause doc-l${block.level || 1}`}>
          <span className={`doc-clause-num${flash ? ' renumbered' : ''}`}>{block.number}</span>
          <div className="doc-clause-body">
            <Editable
              id={block.id}
              html={block.html}
              canEdit={canEdit}
              register={register}
              onFocus={onFocus}
              onKey={onKey}
              placeholder={PLACEHOLDER.clause}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="blockrow" data-block={block.id}>
      {gutter}
      <div className="doc-para">
        <Editable
          id={block.id}
          html={block.html}
          canEdit={canEdit}
          register={register}
          onFocus={onFocus}
          onKey={onKey}
          placeholder={PLACEHOLDER.para}
        />
      </div>
    </div>
  )
}

// ------------------------------------------------------------ annexure panel

export function AnnexurePanel({ doc, onChange, canEdit, activeId, onSelect, readLatest }) {
  const [renaming, setRenaming] = useState(null)
  const annexures = doc.annexures || []

  const update = (fn) => {
    const latest = readLatest(doc)
    onChange({ ...latest, annexures: fn(latest.annexures) })
  }

  const add = () => {
    const id = uid('anx')
    const n = annexures.length
    const letter = String.fromCharCode(65 + n)
    update((list) => [
      ...list,
      { id, title: `Annexure ${letter}: Untitled`, blocks: [newBlock('para')] },
    ])
    onSelect(id)
    setRenaming(id)
  }

  const remove = (id) => {
    const a = annexures.find((x) => x.id === id)
    if (!window.confirm(`Remove “${a.title}” from this draft? The published versions keep their own copy.`)) return
    update((list) => list.filter((x) => x.id !== id))
    if (activeId === id) onSelect(null)
  }

  const move = (id, delta) =>
    update((list) => {
      const i = list.findIndex((x) => x.id === id)
      const j = i + delta
      if (j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const rename = (id, title) => update((list) => list.map((x) => (x.id === id ? { ...x, title } : x)))

  return (
    <div className="panel">
      <div className="panel-head">
        <h4>Annexures</h4>
        <span className="chip">{annexures.length}</span>
        {canEdit && <button className="btn btn-sm" onClick={add}>+ Add</button>}
      </div>

      <div className="panel-body-flush">
        <div
          className={`anx-item${activeId === null ? ' active' : ''}`}
          onClick={() => onSelect(null)}
          role="button"
        >
          <div style={{ flex: 1 }}>
            <div className="anx-title">Main agreement</div>
            <div className="anx-meta">{(doc.blocks || []).length} blocks</div>
          </div>
        </div>

        {annexures.map((a, i) => (
          <div
            key={a.id}
            className={`anx-item${activeId === a.id ? ' active' : ''}`}
            onClick={() => onSelect(a.id)}
            role="button"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {renaming === a.id ? (
                <input
                  className="input"
                  autoFocus
                  defaultValue={a.title}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => { rename(a.id, e.target.value.trim() || a.title); setRenaming(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                />
              ) : (
                <>
                  <div className="anx-title">{a.title}</div>
                  <div className="anx-meta">{a.blocks.length} blocks</div>
                </>
              )}
            </div>
            {canEdit && renaming !== a.id && (
              <div className="anx-actions" onClick={(e) => e.stopPropagation()}>
                <button className="gbtn" onClick={() => move(a.id, -1)} disabled={i === 0} title="Move up">↑</button>
                <button className="gbtn" onClick={() => move(a.id, 1)} disabled={i === annexures.length - 1} title="Move down">↓</button>
                <button className="gbtn" onClick={() => setRenaming(a.id)} title="Rename">✎</button>
                <button className="gbtn gbtn-danger" onClick={() => remove(a.id)} title="Remove">✕</button>
              </div>
            )}
          </div>
        ))}

        {!annexures.length && (
          <div className="panel-body">
            <p className="panel-note">
              No annexures on this agreement yet. Annexures are separate documents (a fee schedule, an assessment rubric)
              attached to this agreement and versioned with it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

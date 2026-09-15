// The editable surface.
//
// Design note that matters for the demo: keystrokes never go into React state.
// Clause numbering derives from a block's `type` and `level`, never from its
// text, so typing requires no re-render at all. Each editable is memoised to
// never re-render while mounted, and its html is read out of the DOM on blur
// and immediately before any structural change. That removes the entire class
// of caret-jump bugs that contentEditable-in-React is famous for.

import { memo, useEffect, useRef, useState } from 'react'

/** True when the current selection sits inside `el`. */
function selectionInside(el) {
  const sel = window.getSelection()
  if (!sel || !sel.anchorNode || !el) return false
  return el.contains(sel.anchorNode)
}

/** True when the caret is at the very start of `el`, markup notwithstanding. */
function caretAtStart(el) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false
  const range = sel.getRangeAt(0).cloneRange()
  range.selectNodeContents(el)
  range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset)
  return range.toString().length === 0
}

export const Editable = memo(
  function Editable({ id, html, placeholder, canEdit, register, onFocus, onKey, className = 'editable' }) {
    const ref = useRef(null)

    // Content is written once per mount. React never re-renders this node, so
    // it can never stomp the caret mid-sentence.
    useEffect(() => {
      if (ref.current) ref.current.innerHTML = html || ''
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    // Publish a reader so the parent can pull the latest html on demand.
    useEffect(() => {
      register(id, () => ref.current?.innerHTML ?? '')
      return () => register(id, null)
    }, [id, register])

    return (
      <div
        ref={ref}
        className={className}
        contentEditable={canEdit}
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder={placeholder}
        onFocus={() => onFocus?.(id)}
        onKeyDown={(e) => onKey?.(e, id, ref.current)}
        onPaste={(e) => {
          // Someone will paste straight out of the Google Doc during the demo.
          // Take the words, leave the <div>/<span style> soup behind.
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
      />
    )
  },
  // Never re-render an editable while it is mounted. A different block id means
  // a different key, which means a fresh mount anyway.
  (a, b) => a.id === b.id && a.canEdit === b.canEdit,
)

export { selectionInside, caretAtStart }

/**
 * Formatting + structure toolbar.
 *
 * Every button preventDefaults on mousedown. Without that the click blurs the
 * editable, the selection collapses, and Bold silently does nothing -- the
 * single most likely way a live editing demo falls over.
 */
export function EditorToolbar({ canEdit, surfaceRef, onInsert }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const exec = (cmd, arg) => {
    if (!canEdit) return
    if (!selectionInside(surfaceRef.current)) return
    document.execCommand(cmd, false, arg)
  }

  const swallow = (e) => e.preventDefault()

  const link = () => {
    if (!canEdit || !selectionInside(surfaceRef.current)) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      window.alert('Select the text you want to turn into a link first.')
      return
    }
    const url = window.prompt('Link URL', 'https://')
    if (url) document.execCommand('createLink', false, url)
  }

  const insert = (type, level) => {
    setMenuOpen(false)
    onInsert(type, level)
  }

  // Indent and outdent are not here on purpose: the per-block gutter offers
  // them on the block they apply to, and Tab / Shift+Tab do the same. Two
  // toolbar buttons that sit disabled until something is focused were noise.
  return (
    <div className="toolbar">
      <button className="tool tool-b" onMouseDown={swallow} onClick={() => exec('bold')} disabled={!canEdit} title="Bold (Ctrl+B)">B</button>
      <button className="tool tool-i" onMouseDown={swallow} onClick={() => exec('italic')} disabled={!canEdit} title="Italic (Ctrl+I)">I</button>
      <button className="tool" onMouseDown={swallow} onClick={link} disabled={!canEdit} title="Insert link">🔗</button>
      <button className="tool" onMouseDown={swallow} onClick={() => exec('removeFormat')} disabled={!canEdit} title="Clear formatting">Clear</button>

      <span className="tool-sep" />

      <div className="toolmenu" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false) }}>
        <button
          className={`tool${menuOpen ? ' active' : ''}`}
          onMouseDown={swallow}
          onClick={() => setMenuOpen((o) => !o)}
          disabled={!canEdit}
          aria-expanded={menuOpen}
        >
          + Insert ▾
        </button>
        {menuOpen && (
          <div className="toolmenu-list">
            <button onMouseDown={swallow} onClick={() => insert('clause', 1)}>Clause</button>
            <button onMouseDown={swallow} onClick={() => insert('clause', 2)}>Sub-clause</button>
            <button onMouseDown={swallow} onClick={() => insert('heading')}>Section heading</button>
            <button onMouseDown={swallow} onClick={() => insert('para')}>Paragraph</button>
            <button onMouseDown={swallow} onClick={() => insert('table')}>Table</button>
          </div>
        )}
      </div>

      <span className="toolbar-hint">
        Hover any clause for move, indent and delete · Tab and Shift+Tab to indent
      </span>
    </div>
  )
}

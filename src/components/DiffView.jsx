// Version-to-version diff rendering.
//
// The diff always compares PLAIN TEXT, never raw html. Tokenising markup on
// whitespace would put "<b>bold" inside an <ins> span, the browser would
// auto-close the tag, and the layout would break. A diff is a comparison, not
// a formatting preview.

import { Fragment } from 'react'
import { blockText, plainText } from '../lib/doc.js'
import { Badge } from './Ui.jsx'

const TAG_LABEL = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Edited',
  moved: 'Moved',
  renumbered: 'Renumbered',
}

const Tag = ({ type }) =>
  TAG_LABEL[type] ? <span className={`diff-tag diff-tag-${type}`}>{TAG_LABEL[type]}</span> : null

/** A block rendered flat, for one side of the diff. */
function Side({ block, words, side }) {
  if (!block) return null

  if (block.type === 'heading') {
    return <div className="diff-heading">{plainText(block.html)}</div>
  }

  if (words) {
    // Word-level diff: the left column shows deletions, the right shows
    // insertions, and both show the common text.
    return (
      <span>
        {words.map((w, i) => {
          if (w.type === 'same') return <Fragment key={i}>{w.text} </Fragment>
          if (w.type === 'del' && side !== 'right') return <del className="w" key={i}>{w.text} </del>
          if (w.type === 'add' && side !== 'left') return <ins className="w" key={i}>{w.text} </ins>
          return null
        })}
      </span>
    )
  }

  if (block.type === 'table') {
    const [head, ...body] = block.rows || []
    return (
      <table className="doc-table" style={{ margin: '2px 0' }}>
        {head && <thead><tr>{head.map((c, i) => <th key={i}>{plainText(c)}</th>)}</tr></thead>}
        <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{plainText(c)}</td>)}</tr>)}</tbody>
      </table>
    )
  }

  return <span>{blockText(block)}</span>
}

function Rows({ rows, mode, onlyChanges }) {
  const out = []
  let skipped = 0

  const flushSkipped = (key) => {
    if (!skipped) return
    out.push(
      <tr key={`skip-${key}`}>
        <td colSpan={mode === 'split' ? 4 : 2} className="diff-collapse-note">
          {skipped} unchanged {skipped === 1 ? 'block' : 'blocks'} hidden
        </td>
      </tr>,
    )
    skipped = 0
  }

  rows.forEach((row, i) => {
    if (row.type === 'same' && onlyChanges) {
      skipped += 1
      return
    }
    flushSkipped(i)

    const cls = `diff-row-${row.type}`

    if (mode === 'split') {
      out.push(
        <tr key={i} className={cls}>
          <td className={`diff-num${row.left ? '' : ' diff-side-empty'}`}>{row.left?.number || ''}</td>
          <td className={row.left ? '' : 'diff-side-empty'}>
            {row.left && row.type !== 'same' && row.type !== 'moved' && <Tag type={row.type === 'added' ? 'added' : row.type} />}
            <Side block={row.left} words={row.words} side="left" />
          </td>
          <td className={`diff-num${row.right ? '' : ' diff-side-empty'}`}>{row.right?.number || ''}</td>
          <td className={row.right ? '' : 'diff-side-empty'}>
            {row.right && row.type !== 'same' && <Tag type={row.type} />}
            <Side block={row.right} words={row.words} side="right" />
          </td>
        </tr>,
      )
    } else {
      const block = row.right || row.left
      out.push(
        <tr key={i} className={cls}>
          <td className="diff-num">{block?.number || ''}</td>
          <td>
            {row.type !== 'same' && <Tag type={row.type} />}
            {row.type === 'changed' ? (
              <Side block={block} words={row.words} side="both" />
            ) : (
              <Side block={block} />
            )}
          </td>
        </tr>,
      )
    }
  })

  flushSkipped('end')
  return out
}

export function DiffView({ diff, leftLabel, rightLabel, mode = 'split', onlyChanges = true }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="diff-table">
        {mode === 'split' ? (
          <>
            <colgroup>
              <col className="gutter" /><col /><col className="gutter" /><col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={2}>{leftLabel}</th>
                <th colSpan={2}>{rightLabel}</th>
              </tr>
            </thead>
          </>
        ) : (
          <>
            <colgroup><col className="gutter" /><col /></colgroup>
            <thead>
              <tr><th colSpan={2}>{leftLabel} → {rightLabel}</th></tr>
            </thead>
          </>
        )}
        <tbody>
          <Rows rows={diff.body} mode={mode} onlyChanges={onlyChanges} />
        </tbody>

        {diff.annexures.map((anx) => (
          <Fragment key={anx.id}>
            <tbody>
              <tr>
                <td colSpan={mode === 'split' ? 4 : 2} className="diff-annexure-head">
                  <span>{anx.title}</span>
                  {anx.previousTitle && <span className="small muted">renamed from “{anx.previousTitle}”</span>}
                  {anx.status === 'added' && <Badge tone="green">Annexure added</Badge>}
                  {anx.status === 'removed' && <Badge tone="red">Annexure removed</Badge>}
                  {anx.status === 'changed' && <Badge tone="amber">Annexure edited</Badge>}
                  {anx.status === 'same' && <Badge tone="grey">Unchanged</Badge>}
                </td>
              </tr>
              {anx.status !== 'same' && <Rows rows={anx.rows} mode={mode} onlyChanges={onlyChanges} />}
            </tbody>
          </Fragment>
        ))}
      </table>
    </div>
  )
}

export function DiffStats({ stats }) {
  const items = [
    ['added', 'green', 'added'],
    ['removed', 'red', 'removed'],
    ['changed', 'amber', 'edited'],
    ['moved', 'blue', 'moved'],
    ['renumbered', 'blue', 'renumbered'],
  ].filter(([key]) => stats[key] > 0)

  if (!items.length) return <Badge tone="grey">No differences</Badge>

  return (
    <div className="diff-stats">
      {items.map(([key, tone, label]) => (
        <Badge key={key} tone={tone}>{stats[key]} {label}</Badge>
      ))}
      {stats.unchanged > 0 && <Badge tone="grey" plain>{stats.unchanged} unchanged</Badge>}
    </div>
  )
}

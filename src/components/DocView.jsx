// Read-only document renderer. Used by the version viewer, the change-request
// form and the learner preview, so all three are guaranteed to show exactly
// what the editor is editing.

import { numberBlocks } from '../lib/doc.js'

const Html = ({ html, className }) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: html || '' }} />
)

function Block({ block }) {
  if (block.type === 'heading') return <h3 className="doc-heading">{stripToText(block.html)}</h3>

  if (block.type === 'table') {
    const [head, ...body] = block.rows || []
    return (
      <table className="doc-table">
        {head && (
          <thead>
            <tr>{head.map((cell, i) => <th key={i} dangerouslySetInnerHTML={{ __html: cell }} />)}</tr>
          </thead>
        )}
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>{row.map((cell, i) => <td key={i} dangerouslySetInnerHTML={{ __html: cell }} />)}</tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (block.type === 'clause') {
    return (
      <div className={`doc-clause doc-l${block.level || 1}`}>
        <span className="doc-clause-num">{block.number}</span>
        <Html className="doc-clause-body" html={block.html} />
      </div>
    )
  }

  return <Html className="doc-para" html={block.html} />
}

// Headings are plain captions -- render them as text so stray markup in a
// heading can't break the page layout.
const stripToText = (html) => String(html || '').replace(/<[^>]*>/g, '')

export function DocBlocks({ blocks }) {
  const numbered = numberBlocks(blocks || [])
  if (!numbered.length) return <p className="doc-empty-line">This document has no content yet.</p>
  return numbered.map((b) => <Block key={b.id} block={b} />)
}

export function DocView({ doc, showAnnexures = true }) {
  return (
    <div className="doc">
      <DocBlocks blocks={doc?.blocks} />
      {showAnnexures &&
        (doc?.annexures || []).map((a) => (
          <section className="doc-annexure" key={a.id}>
            <h3 className="doc-annexure-title">{a.title}</h3>
            <DocBlocks blocks={a.blocks} />
          </section>
        ))}
    </div>
  )
}

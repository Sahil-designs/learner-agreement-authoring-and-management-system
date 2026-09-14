// Small formatting helpers. Locale is pinned to en-IN because every stakeholder
// in the room reads dates as DD Mon YYYY and money in lakhs.

// Pinned to IST so the demo reads the same on any machine, whatever the
// presenter's laptop timezone happens to be.
const IST = 'Asia/Kolkata'
const DT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: IST,
})
const DTT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST,
})

export const fmtDate = (iso) => (iso ? DT.format(new Date(iso)) : '—')
export const fmtDateTime = (iso) => (iso ? DTT.format(new Date(iso)) : '—')

export function fmtRelative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return fmtDate(iso)
}

export const fmtNumber = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0)

// "v3" / "—" for an agreement that has never been published.
export const fmtVersion = (v) => (v ? `v${v}` : '—')

// Stable-ish ids. No backend, so a counter plus a prefix is plenty.
let seq = 0
export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`

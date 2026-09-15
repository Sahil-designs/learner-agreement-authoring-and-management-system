# Learner Agreement Authoring & Management

A clickable prototype of an agreement authoring tool inside **Streamline**, built for a
stakeholder walkthrough with legal, product and compliance.

Today Entri's learner agreement lives in a Google Doc. Legal edits the doc, a developer hardcodes
the changes into the app, and it ships with a release. There is no versioning, no audit trail of
who changed what, no access control, and every wording change costs engineering time. This
prototype shows what replacing that looks like.

> **This is a pitch prototype, not production code.** No backend, no API calls, no authentication.
> All state is in memory, seeded from a single mock data file, and mirrored to `localStorage` so an
> accidental refresh mid-meeting doesn't lose your place.

## Run it

```bash
npm install
npm run dev
```

Then open the URL it prints (http://localhost:5173). **Desktop only**: the layout assumes
≥1280px and there are deliberately no mobile breakpoints.

## The two ideas the data model is built around

Both are structurally true in the prototype, not just claimed on a slide.

**1. Content varies by course × plan, not by course alone.** The same course under an NSDC plan
carries certification conditions the standard plan doesn't. A new combination is created by
duplicating the closest existing agreement, so nobody hand-authors a document per combination.
The **Course × plan coverage** tab shows which combinations exist and which are still gaps.

**2. Enrollments hold a frozen snapshot.** `versions` is append-only; no code path in the reducer
reaches into a published version. Acceptance records reference `(learner, agreement, version)`, so
publishing is physically incapable of changing what someone already accepted. A retroactive
publish writes a *new* acceptance row alongside the old one; it never overwrites it.

---

## Suggested demo click-path

The story runs from *"legal needs to update a clause"* to *"we can prove who accepted what."*
About 10-12 minutes. Everything below works, with no dead ends.

### 1 · The problem, framed: Agreement library
Land on **Agreement library**. Eight agreements across five courses and three plans. Point out the
columns legal never had before: live version, status, who edited it last and when.

Switch to the **Course × plan coverage** tab. Fifteen combinations, eight covered, seven gaps.
*"This is the question the Google Doc could never answer."*

### 2 · The answer to "don't hand-author every combination"
Click any empty cell (say **Digital Marketing × NSDC Certified**) and the create form opens with
that combination pre-filled. Choose **Duplicate an existing agreement** and pick
*BFSI: NSDC Certified*. It copies the full clause structure and annexures; legal edits only what
differs. Create it, and note the new Draft in the library.

### 3 · A real edit: the auto-renumbering moment
Open **Full Stack Development: Standard Terms** (v3, 2,431 active learners).

This is the most important thirty seconds of the demo:

- Hover any clause to reveal the gutter on the left: move, indent, outdent, delete.
- **Delete clause 3.1.** Everything below renumbers instantly: 3.2 becomes 3.1, and the change
  cascades through the rest of the document. Changed numbers flash amber so the room sees it.
- Hover between two clauses and click **insert clause** to add one mid-document. Everything
  renumbers again.
- Press **Tab** on the new clause to indent it to 3.1.1, **Shift+Tab** to outdent.
- Select some text and hit **B** for bold, or add a link.
- **+ Insert** adds a heading, paragraph or table wherever you're working.

Clause numbers are never stored. They are derived from the document structure on every render,
which is why this cannot drift out of sync.

Open the **Annexures** panel on the right: three annexures on this agreement, each its own
editable document. Click one to edit it, add one, reorder them.

Hit **Preview**. It opens on **Learner view**, exactly what the student sees in the app at
enrollment, and its second tab **Changes vs live** diffs your draft against the published
version. Same question, one place: is this ready to publish?

### 4 · The decision legal actually cares about: Publish
**Publish v4**:
- Try to publish with an empty change summary. It is required, and the form says so.
- Fill it in, then choose between **New enrollments only** and **Apply retroactively and trigger
  re-consent**.
- Select retroactive. The impact estimate appears: **2,431 active learners will be prompted to
  re-consent.** That figure is computed from the agreement's cohort, not typed into a mockup.
- Optionally set an effective-from date, then confirm.

Version increments, status updates, and the change is written to version history and the audit log
in the same action.

### 5 · The thing that sells it over a Google Doc: Version history and diff
Go to **Version history**. Four versions now, on a timeline with change summaries, authors, and
whether each triggered re-consent. v3 shows the re-consent aftermath: 2,431 prompted, 1,204
re-accepted, 1,227 still pending.

Click **What changed from v1** on v2. This is the screenshot to linger on:

- `seven (7)` struck through, `fourteen (14)` inserted
- `₹2,500` → `₹1,500`
- `three (3)` → `four (4)` live sessions
- A whole new NBFC foreclosure clause marked **Added**

Toggle **Inline** and **Only show changes**. Then compare **v2 → v3** to show a clause that *moved*
(batch transfer relocated from Part A to Part C) and a whole new **Annexure C** flagged as added.

Click **View v1** to read any past version read-only. There is no rollback by design. A correction
is published as a new version so the record stays complete.

### 6 · Who's allowed to do what: role switcher
In the **Demo controls** panel (bottom left, marked as scaffolding, not product), switch to
**Arjun Rao (Product Manager)**.

Back on the agreement: the document is genuinely not editable, the toolbar is disabled, and
**Edit** has been replaced by **Request change**. Raise one: pick a section, describe the change,
say why, set a priority. Submit it.

### 7 · Tracked, not a Slack thread: Change requests
Switch back to **Priya Menon (Legal owner)**. Open **Change requests**: five requests across Open,
In review, Actioned and Rejected.

Open the one you just raised and click **Action in editor**. The editor opens with the request
**pinned in a side panel**, so the ask and the reason sit beside the document while you make the
change. Publishing from here auto-resolves the request and pre-fills the change summary with it.

### 8 · Proving it: Audit log and Acceptance lookup
**Audit log**: every create, draft save, submission, approval, publish, re-consent and change
request, filterable by user, agreement, event type and date range. Audit entries are written by the
same action that makes the change, so the log cannot drift from reality. Click **View diff** on a
publish entry to jump straight to what changed in that version.

**Acceptance lookup**, the compliance close-out. Search **`ENT-LRN-10234`** (Aparna Nair):

> Full Stack Development: Standard Terms
> **v3** · accepted 03 Aug 2026 · *Re-consent*
> **v2** · accepted 12 Jun 2026 · *At enrollment*

Two records, both kept. Publishing v3 retroactively did not overwrite her v2 acceptance. Click
**View what they signed** to read the exact frozen snapshot she agreed to.

Then search **`ENT-LRN-10871`** (Vishnu Prasad), still on v1 while live is v3, flagged **Pending
re-consent**. That is the blast radius made concrete.

### Also worth showing if asked
- **Approval before publish.** Open *Data Analytics: NSDC Certified* (Pending approval). Its draft
  was submitted by Rahul, so Rahul cannot approve or publish it. Switch to Priya and the
  **Approve** button appears and Publish unlocks. Four-eyes, demoed live.
- **Empty, loading and error states.** Filter the library to something with no matches. Hit
  **Simulate error** in the demo controls to force every list view into its error state, then
  **Retry**.
- **Reset demo** restores the seed file for the next run-through.

---

## Editing the mock data during the pitch

Everything lives in **`src/data/seed.js`**: courses, plans, users, agreements, change requests,
audit entries and acceptance records. Vite hot-reloads on save.

Later versions of the flagship agreement are built by applying named edits to the version before
them:

```js
const FSD_STD_V2_EDITS = [
  replaceHtml('fsd-c1-1', '…within <b>fourteen (14) days</b>…₹1,500.'),
  insertAfter('fsd-c1-3', c('fsd-c1-4', 2, 'Where fees have been disbursed by a partner NBFC…')),
  …
]
```

Block IDs are correct by construction, so the diff is provably genuine rather than accidentally
reporting every clause as rewritten, and the seed file doubles as a readable record of what legal
changed in each version.

If you change seed data while the app is open, hit **Reset demo** so `localStorage` picks it up.

## How it's built

React 18 + Vite, no UI library, no router, hand-written CSS. ~20 files.

| Path | What's in it |
| --- | --- |
| `src/data/seed.js` | **All** mock data, the one file to edit live |
| `src/lib/doc.js` | Block model, clause numbering, LCS diff, version-authoring helpers |
| `src/state/store.js` | Reducer, actions, `withAudit`, localStorage persistence |
| `src/state/selectors.js` | Derived reads: status, coverage, acceptance records |
| `src/components/` | Editor surface, annexure panel, diff view, publish modal, primitives |
| `src/screens/` | Library, Editor, Version history, Change requests, Audit log, Acceptances |

A few decisions worth knowing:

- **Clause numbers are derived, never stored.** `numberBlocks()` walks the block array on every
  render. That is why insert/delete/indent renumbers correctly with nothing to keep in sync.
- **Keystrokes never enter React state.** Numbering depends on a block's type and level, not its
  text, so typing triggers no re-render. Each editable is memoised and its html is read out of the
  DOM on blur and before any structural change, which removes the caret-jump bugs that
  contentEditable-in-React is known for.
- **Structural edits are driven by visible buttons**, with keyboard shortcuts as a bonus. A gutter
  click is something the room can see; a Backspace keypress is invisible from the third row.
- **The diff compares plain text, never raw html.** Tokenising markup on whitespace would put
  `<b>bold` inside an `<ins>` and break the layout.
- **Every mutating reducer case routes through `withAudit`**, so it is structurally impossible to
  change something without leaving an audit trail.

## Deliberately not built

Authentication, real API integration, the learner-side in-app viewer beyond the Preview modal,
notification delivery, PDF export, and version rollback/restore are all out of scope.

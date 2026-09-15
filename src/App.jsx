// App shell: navigation, the dev-only role switcher, toasts, and routing.
//
// Nothing imports from this file -- state lives in src/state/ and reaches
// screens through AppContext.

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { AppContext } from './state/AppContext.jsx'
import { reducer, loadState, persistState, clearPersisted } from './state/store.js'
import { agreementStatus, isLegalOwner } from './state/selectors.js'
import { USERS, ROLE_LABEL } from './data/seed.js'
import { Toasts } from './components/Ui.jsx'
import { Library } from './screens/Library.jsx'
import { Editor } from './screens/Editor.jsx'
import { VersionHistory } from './screens/VersionHistory.jsx'
import { ChangeRequests } from './screens/ChangeRequests.jsx'
import { AuditLog } from './screens/AuditLog.jsx'
import { Acceptances } from './screens/Acceptances.jsx'

// Each screen owns its own header. There is no separate topbar repeating the
// screen name back at you.
const SCREENS = {
  library: Library,
  editor: Editor,
  history: VersionHistory,
  requests: ChangeRequests,
  audit: AuditLog,
  acceptances: Acceptances,
}

// ------------------------------------------------------------------- routing
//
// Routes live in location.hash so a Vite hot reload while prepping does not
// dump you out of the editor, and so a demo can be restarted mid-flow from a
// bookmark.

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [screen = 'library', id = null, extra = null] = raw.split('/').filter(Boolean)
  return SCREENS[screen] ? { screen, id, extra } : { screen: 'library', id: null, extra: null }
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((screen, id, extra) => {
    const path = ['#', screen, id, extra].filter(Boolean).join('/')
    if (window.location.hash === path) setRoute(parseHash())
    else window.location.hash = path
    window.scrollTo(0, 0)
  }, [])

  return [route, navigate]
}

// ----------------------------------------------------------------------- app

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [route, navigate] = useHashRoute()

  useEffect(() => { persistState(state) }, [state])

  const user = useMemo(
    () => USERS.find((u) => u.id === state.currentUserId) || USERS[0],
    [state.currentUserId],
  )

  const value = useMemo(() => ({ state, dispatch, user, route, navigate }), [state, user, route, navigate])
  const Screen = SCREENS[route.screen]

  const openRequests = state.changeRequests.filter((r) => r.status === 'open' || r.status === 'in_review').length
  const pendingApprovals = state.agreements.filter((a) => agreementStatus(a).awaitingApproval).length

  return (
    <AppContext.Provider value={value}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <div className="brand-dot">S</div>
              <div>
                <div className="brand-name">Streamline</div>
                <div className="brand-sub">Entri · Internal</div>
              </div>
            </div>
          </div>

          <nav className="nav">
            <div className="nav-label">Agreements</div>
            <NavItem icon="📄" label="Agreement library" active={['library', 'editor', 'history'].includes(route.screen)}
              onClick={() => navigate('library')} />
            <NavItem icon="📥" label="Change requests" active={route.screen === 'requests'}
              count={openRequests} onClick={() => navigate('requests')} />

            <div className="nav-label">Compliance</div>
            <NavItem icon="🗒" label="Audit log" active={route.screen === 'audit'} onClick={() => navigate('audit')} />
            <NavItem icon="✅" label="Acceptance lookup" active={route.screen === 'acceptances'}
              onClick={() => navigate('acceptances')} />

            {pendingApprovals > 0 && (
              <>
                <div className="nav-label">Awaiting you</div>
                <NavItem icon="⏳" label="Drafts pending approval" count={pendingApprovals}
                  onClick={() => navigate('library')} />
              </>
            )}
          </nav>

          <div className="who">
            <div className="avatar">{user.initials}</div>
            <div>
              <div className="who-name">{user.name}</div>
              <div className="who-role">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>

          <DevStrip state={state} dispatch={dispatch} user={user} />
        </aside>

        <main className="main">
          <Screen />
        </main>
      </div>

      <Toasts toasts={state.toasts} onDismiss={(id) => dispatch({ type: 'DISMISS_TOAST', id })} />
    </AppContext.Provider>
  )
}

function NavItem({ icon, label, active, count, onClick }) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {count > 0 && <span className="nav-count">{count}</span>}
    </button>
  )
}

/**
 * Deliberately loud. This is scaffolding for the pitch -- a real deployment
 * would take the acting user from the session, not a dropdown.
 */
function DevStrip({ state, dispatch, user }) {
  return (
    <div className="devstrip">
      <div className="devstrip-title">Demo controls — not product</div>

      <label htmlFor="role-switch">Acting as</label>
      <select
        id="role-switch"
        value={state.currentUserId}
        onChange={(e) => dispatch({ type: 'SET_USER', userId: e.target.value })}
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>{u.name} — {ROLE_LABEL[u.role]}</option>
        ))}
      </select>

      <div className="devstrip-role">
        {isLegalOwner(user)
          ? 'Full rights: create, edit, submit, approve and publish.'
          : 'Read-only on content. Edit is replaced by Request change.'}
      </div>

      <div className="devstrip-row">
        <button
          className={state.simulateError ? 'on' : ''}
          onClick={() => dispatch({ type: 'SET_SIMULATE_ERROR', value: !state.simulateError })}
          title="Force list views into their error state"
        >
          {state.simulateError ? 'Errors: on' : 'Simulate error'}
        </button>
        <button
          onClick={() => {
            if (!window.confirm('Reset all demo data back to the seed file? Anything published or requested in this session is lost.')) return
            clearPersisted()
            dispatch({ type: 'RESET' })
          }}
          title="Restore the seed data"
        >
          Reset demo
        </button>
      </div>
    </div>
  )
}

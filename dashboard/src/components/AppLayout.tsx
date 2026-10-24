import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

export function AppLayout() {
  const { session, signOut } = useAuth()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src="/logo.png" alt="" />
          <span>
            Lighthouse
            <br />
            Fellowship
          </span>
        </div>
        <nav className="sidebar__nav" aria-label="Main">
          <NavLink to="/notes">Sermon notes</NavLink>
          <NavLink to="/account">Account</NavLink>
        </nav>
        <div className="sidebar__footer">
          <span>{session?.admin.displayName}</span>
          <button type="button" className="button button--ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

import type { AdminAccount } from '../api/types'

export type Session = {
  token: string
  expiresAt: string
  admin: AdminAccount
}

// sessionStorage, not localStorage: the session ends when the browser closes, and
// a token never outlives the tab it was issued to (dashboard-builder skill).
const KEY = 'lighthouse.session'

function isExpired(session: Session, now = Date.now()) {
  return Date.parse(session.expiresAt) <= now
}

export const tokenStorage = {
  load(): Session | null {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) {
        return null
      }
      const session = JSON.parse(raw) as Session
      if (!session.token || isExpired(session)) {
        sessionStorage.removeItem(KEY)
        return null
      }
      return session
    } catch {
      return null
    }
  },

  save(session: Session) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(session))
    } catch {
      // Storage blocked: the session still works in memory until the page reloads.
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // Nothing to clear.
    }
  },
}

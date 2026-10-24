import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../api/client'
import { login } from '../api/endpoints'
import type { AuthResponse } from '../api/types'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { tokenStorage, type Session } from './tokenStorage'

function toSession(response: AuthResponse): Session {
  return { token: response.token, expiresAt: response.expiresAt, admin: response.admin }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(() => tokenStorage.load())

  const signOut = useCallback(() => {
    tokenStorage.clear()
    queryClient.clear()
    setSession(null)
  }, [queryClient])

  const replaceSession = useCallback((response: AuthResponse) => {
    const next = toSession(response)
    tokenStorage.save(next)
    setSession(next)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      replaceSession(await login(email, password))
    },
    [replaceSession],
  )

  // Any 401 from the API (expired token, password changed elsewhere) signs out;
  // RequireAdmin then sends the admin to /login and back afterwards.
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Admin tokens last 8 hours with no refresh: sign out the moment one expires
  // rather than on the next failed request.
  useEffect(() => {
    if (!session) {
      return
    }
    const remaining = Date.parse(session.expiresAt) - Date.now()
    const timer = window.setTimeout(signOut, Math.max(0, Math.min(remaining, 2_147_000_000)))
    return () => window.clearTimeout(timer)
  }, [session, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ session, signIn, replaceSession, signOut }),
    [session, signIn, replaceSession, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

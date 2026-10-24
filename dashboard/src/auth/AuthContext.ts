import { createContext, useContext } from 'react'
import type { AuthResponse } from '../api/types'
import type { Session } from './tokenStorage'

export type AuthContextValue = {
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  // After a password change the server returns a fresh token; older ones stop working.
  replaceSession: (response: AuthResponse) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}

import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { createQueryClient, routes } from '../routes'
import type { AuthResponse } from '../api/types'
import { AuthProvider } from '../auth/AuthProvider'
import { tokenStorage } from '../auth/tokenStorage'

export const ADMIN_LOGIN: AuthResponse = {
  token: 'test-token',
  tokenType: 'Bearer',
  expiresAt: '2099-01-01T00:00:00Z',
  admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'Pastor Joe', role: 'ADMIN' },
}

export function signedIn() {
  tokenStorage.save({ token: ADMIN_LOGIN.token, expiresAt: ADMIN_LOGIN.expiresAt, admin: ADMIN_LOGIN.admin })
}

type Handler = (url: URL, init: RequestInit) => { status: number; body?: unknown }

// Stubs fetch with a tiny router over method + path, and records every call.
export function mockApi(handler: Handler) {
  const calls: { url: URL; init: RequestInit }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input))
    calls.push({ url, init })
    const { status, body } = handler(url, init)
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return router
}

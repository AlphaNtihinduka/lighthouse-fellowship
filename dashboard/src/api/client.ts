import { tokenStorage } from '../auth/tokenStorage'
import type { ApiErrorBody } from './types'

// Build-time base URL of the backend (plain HTTP to the VPS during testing, HTTPS at
// release). Only the public API URL belongs in VITE_* variables: they ship to the browser.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8081').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(status: number, message: string, path: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

// The AuthProvider registers itself here, so any 401 on an authenticated request
// signs the admin out wherever it happens.
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // false for the login call: a 401 there means a wrong password, not an expired session.
  authenticated?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true } = options
  const headers: Record<string, string> = { Accept: 'application/json' }

  const token = authenticated ? tokenStorage.load()?.token : undefined
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', path)
  }

  if (response.status === 401 && authenticated) {
    tokenStorage.clear()
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response), path)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>
    if (body.message) {
      return body.message
    }
  } catch {
    // Not JSON (e.g. a proxy error page); fall through to a generic message.
  }
  if (response.status === 429) {
    return 'Too many attempts. Try again later.'
  }
  return `Request failed (${response.status})`
}

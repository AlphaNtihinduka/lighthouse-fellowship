import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { tokenStorage } from '../auth/tokenStorage'
import { ADMIN_LOGIN, mockApi, renderApp, signedIn } from '../test/renderApp'
import { safeNextPath } from '../auth/safeNextPath'

describe('LoginPage', () => {
  it('signs in, stores the session in sessionStorage and returns to the intended page', async () => {
    const calls = mockApi((url) =>
      url.pathname === '/api/auth/login' ? { status: 200, body: ADMIN_LOGIN } : { status: 200, body: [] },
    )
    const router = renderApp('/notes?month=2026-09')

    // Not signed in: sent to /login, remembering where it was going.
    await screen.findByRole('heading', { name: 'Sermon Notes' })
    expect(router.state.location.search).toContain('next=%2Fnotes%3Fmonth%3D2026-09')

    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await screen.findByRole('heading', { name: 'Sermon notes' })
    expect(router.state.location.pathname).toBe('/notes')
    expect(router.state.location.search).toBe('?month=2026-09')
    expect(tokenStorage.load()?.token).toBe('test-token')
    expect(localStorage.length).toBe(0)

    const loginCall = calls.find((call) => call.url.pathname === '/api/auth/login')!
    expect(JSON.parse(String(loginCall.init.body))).toEqual({
      email: 'admin@example.com',
      password: 'correct horse battery',
    })
    // Later calls carry the token. The notes request starts just after the page first
    // renders, so wait for it rather than assume it has already been sent.
    const listCall = await waitFor(() => {
      const call = calls.find((c) => c.url.pathname === '/api/admin/notes')
      expect(call).toBeDefined()
      return call!
    })
    expect((listCall.init.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
  })

  it('shows the server message on a wrong password and stays on the page', async () => {
    mockApi(() => ({ status: 401, body: { status: 401, message: 'Invalid email or password' } }))
    renderApp('/login')

    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(tokenStorage.load()).toBeNull()
  })

  it('sends an admin who is already signed in straight on', async () => {
    signedIn()
    mockApi(() => ({ status: 200, body: [] }))
    const router = renderApp('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe('/notes'))
  })
})

describe('safeNextPath', () => {
  it('allows only paths inside the dashboard', () => {
    expect(safeNextPath('/notes/abc')).toBe('/notes/abc')
    expect(safeNextPath('//evil.example')).toBe('/notes')
    expect(safeNextPath('/\\evil.example')).toBe('/notes')
    expect(safeNextPath('https://evil.example')).toBe('/notes')
    expect(safeNextPath(null)).toBe('/notes')
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { tokenStorage } from '../auth/tokenStorage'
import { ADMIN_LOGIN, mockApi, renderApp, signedIn } from '../test/renderApp'
import { passwordProblem } from '../auth/passwordRules'

describe('passwordProblem', () => {
  it('enforces the same rules as the backend', () => {
    expect(passwordProblem('short', 'short')).toMatch(/at least 12/)
    expect(passwordProblem('a'.repeat(73), 'a'.repeat(73))).toMatch(/too long/)
    expect(passwordProblem('long enough password', 'different password')).toMatch(/do not match/)
    expect(passwordProblem('long enough password', 'long enough password')).toBeNull()
  })
})

describe('AccountPage', () => {
  it('changes the password and switches to the new token', async () => {
    signedIn()
    const calls = mockApi(() => ({ status: 200, body: { ...ADMIN_LOGIN, token: 'new-token' } }))
    renderApp('/account')

    await userEvent.type(await screen.findByLabelText('Current password'), 'old password 123')
    await userEvent.type(screen.getByLabelText('New password'), 'a brand new password')
    await userEvent.type(screen.getByLabelText('Repeat new password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Password changed')
    expect(tokenStorage.load()?.token).toBe('new-token')
    const call = calls.find((c) => c.url.pathname === '/api/admin/account/password')!
    expect(call.init.method).toBe('PATCH')
    expect(JSON.parse(String(call.init.body))).toEqual({
      currentPassword: 'old password 123',
      newPassword: 'a brand new password',
    })
  })

  it('shows a wrong current password without signing out', async () => {
    signedIn()
    mockApi(() => ({ status: 400, body: { status: 400, message: 'Current password is incorrect' } }))
    renderApp('/account')

    await userEvent.type(await screen.findByLabelText('Current password'), 'wrong password')
    await userEvent.type(screen.getByLabelText('New password'), 'a brand new password')
    await userEvent.type(screen.getByLabelText('Repeat new password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect')
    expect(tokenStorage.load()?.token).toBe('test-token')
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
  })
})

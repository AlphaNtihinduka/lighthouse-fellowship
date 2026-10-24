import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { MIN_PASSWORD, passwordProblem } from '../auth/passwordRules'

export function AccountPage() {
  const { session, replaceSession } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: (response) => {
      // Older tokens stop working on the server; keep this tab signed in with the new one.
      replaceSession(response)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
    },
  })

  const problem = newPassword || confirmation ? passwordProblem(newPassword, confirmation) : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!problem) {
      mutation.mutate()
    }
  }

  return (
    <>
      <h1>Account</h1>
      <div className="card" style={{ maxWidth: 480, marginBottom: '1.5em' }}>
        <p style={{ margin: 0 }}>
          <strong>{session?.admin.displayName}</strong>
          <br />
          <span className="muted">{session?.admin.email}</span>
        </p>
      </div>

      <form className="card" style={{ maxWidth: 480 }} onSubmit={handleSubmit} noValidate>
        <h2>Change password</h2>
        {mutation.isSuccess && (
          <div className="alert alert--success" role="status">
            Password changed. Other devices have been signed out.
          </div>
        )}
        {mutation.isError && (
          <div className="alert alert--error" role="alert">
            {mutation.error.message}
          </div>
        )}
        <div className="field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <span className="field__hint">At least {MIN_PASSWORD} characters.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Repeat new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        {problem && <p className="field__hint" role="status">{problem}</p>}
        <button
          className="button"
          type="submit"
          disabled={mutation.isPending || !currentPassword || !newPassword || problem !== null}
        >
          {mutation.isPending ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </>
  )
}

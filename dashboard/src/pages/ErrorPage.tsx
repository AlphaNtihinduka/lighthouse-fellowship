import { Link, useRouteError } from 'react-router'

// Shown instead of the router's default stack-trace screen when a page crashes.
export function ErrorPage() {
  const error = useRouteError()
  const detail = error instanceof Error ? error.message : null

  return (
    <div className="login">
      <div className="card">
        <h1>Something went wrong</h1>
        <p>This page hit an unexpected error. Unsaved changes on it may be lost.</p>
        {detail && <p className="field__hint">Details: {detail}</p>}
        <p style={{ display: 'flex', gap: '0.5em' }}>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Reload
          </button>
          <Link className="button button--secondary" to="/notes">
            Back to sermon notes
          </Link>
        </p>
      </div>
    </div>
  )
}

import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ErrorPage } from './ErrorPage'

function Crash(): never {
  throw new Error('crypto.randomUUID is not a function')
}

describe('ErrorPage', () => {
  it('replaces the stack-trace screen with a way back', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createMemoryRouter([{ path: '/', element: <Crash />, errorElement: <ErrorPage /> }])
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('Details: crypto.randomUUID is not a function')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sermon notes' })).toHaveAttribute('href', '/notes')
  })
})

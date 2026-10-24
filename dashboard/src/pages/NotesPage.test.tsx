import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AdminNoteSummary } from '../api/types'
import { tokenStorage } from '../auth/tokenStorage'
import { mockApi, renderApp, signedIn } from '../test/renderApp'

const summary = (overrides: Partial<AdminNoteSummary>): AdminNoteSummary => ({
  id: 'n1',
  title: 'Killing Giants',
  preacherName: 'Pastor Joe Benecasa',
  sermonDate: '2026-09-13',
  coverImageUrl: null,
  contentVersion: 1,
  publishAt: null,
  status: 'DRAFT',
  ...overrides,
})

describe('NotesPage', () => {
  it('lists every Sunday of the month with its status', async () => {
    signedIn()
    const calls = mockApi(() => ({
      status: 200,
      body: [
        summary({ id: 'a', sermonDate: '2026-09-13', status: 'PUBLISHED', publishAt: '2026-09-12T08:00:00Z' }),
        summary({ id: 'b', sermonDate: '2026-09-20', title: 'Seeing Jesus in David' }),
        summary({
          id: 'c',
          sermonDate: '2026-09-27',
          title: 'Jesus is in the Boat!',
          preacherName: 'Rev. Bill Steinmetz',
          status: 'SCHEDULED',
          publishAt: '2026-09-27T07:00:00Z',
        }),
      ],
    }))
    renderApp('/notes?month=2026-09')

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('Sunday 6 September')
    expect(within(items[0]).getByText('Empty')).toBeInTheDocument()
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/notes/new?date=2026-09-06')
    expect(items[1]).toHaveTextContent('Killing Giants')
    expect(within(items[1]).getByText('Published')).toBeInTheDocument()
    expect(within(items[2]).getByText('Draft')).toBeInTheDocument()
    expect(items[3]).toHaveTextContent('Rev. Bill Steinmetz')
    // Scheduled time shown in Rome time (07:00 UTC = 09:00 in September).
    expect(within(items[3]).getByText(/Scheduled · Sun 27 Sept?, 09:00/)).toBeInTheDocument()
    expect(within(items[3]).getByRole('link')).toHaveAttribute('href', '/notes/c')

    expect(calls[0].url.search).toBe('?year=2026&month=9')
  })

  it('moves between months, across the year boundary', async () => {
    signedIn()
    const calls = mockApi(() => ({ status: 200, body: [] }))
    renderApp('/notes?month=2026-12')

    await screen.findByText('December 2026')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    await screen.findByText('January 2027')
    await waitFor(() => expect(calls.at(-1)?.url.search).toBe('?year=2027&month=1'))
  })

  it('signs out and returns to login when the token is rejected', async () => {
    signedIn()
    mockApi(() => ({ status: 401, body: { status: 401, message: 'Sign in required' } }))
    const router = renderApp('/notes?month=2026-09')

    await screen.findByRole('heading', { name: 'Sermon Notes' })
    expect(router.state.location.pathname).toBe('/login')
    expect(tokenStorage.load()).toBeNull()
  })

  it('shows an error without signing out when the server fails', async () => {
    signedIn()
    mockApi(() => ({ status: 403, body: { status: 403, message: 'You do not have access to this resource' } }))
    renderApp('/notes?month=2026-09')

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have access to this resource')
    expect(tokenStorage.load()).not.toBeNull()
  })
})

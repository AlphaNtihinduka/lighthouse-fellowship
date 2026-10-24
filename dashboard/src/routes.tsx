import { QueryClient } from '@tanstack/react-query'
import { Navigate, type RouteObject } from 'react-router'
import { ApiError } from './api/client'
import { RequireAdmin } from './auth/RequireAdmin'
import { AppLayout } from './components/AppLayout'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { NoteEditorPage } from './pages/NoteEditorPage'
import { NotesPage } from './pages/NotesPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAdmin>
        <AppLayout />
      </RequireAdmin>
    ),
    children: [
      { path: '/', element: <Navigate to="/notes" replace /> },
      { path: '/notes', element: <NotesPage /> },
      { path: '/notes/new', element: <NoteEditorPage /> },
      { path: '/notes/:id', element: <NoteEditorPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '*', element: <Navigate to="/notes" replace /> },
    ],
  },
]

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Client errors (401, 403, 404) won't fix themselves on a retry.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: true,
      },
    },
  })
}

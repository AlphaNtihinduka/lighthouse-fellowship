import { apiRequest } from './client'
import type { AdminAccount, AdminNote, AdminNoteSummary, AuthResponse, NoteInput } from './types'

export const queryKeys = {
  account: ['admin-account'] as const,
  notes: (year: number, month: number) => ['admin-notes', year, month] as const,
  allNotes: ['admin-notes'] as const,
  note: (id: string) => ['admin-note', id] as const,
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    authenticated: false,
  })
}

export function getAccount() {
  return apiRequest<AdminAccount>('/api/admin/account')
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<AuthResponse>('/api/admin/account/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
  })
}

export function listNotes(year: number, month: number) {
  return apiRequest<AdminNoteSummary[]>(`/api/admin/notes?year=${year}&month=${month}`)
}

export function getNote(id: string) {
  return apiRequest<AdminNote>(`/api/admin/notes/${encodeURIComponent(id)}`)
}

export function createNote(input: NoteInput) {
  return apiRequest<AdminNote>('/api/admin/notes', { method: 'POST', body: input })
}

export function updateNote(id: string, input: NoteInput) {
  return apiRequest<AdminNote>(`/api/admin/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
}

export function deleteNote(id: string) {
  return apiRequest<void>(`/api/admin/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// publishAt omitted = publish now.
export function publishNote(id: string, publishAt?: string) {
  return apiRequest<AdminNote>(`/api/admin/notes/${encodeURIComponent(id)}/publish`, {
    method: 'PATCH',
    body: publishAt ? { publishAt } : {},
  })
}

export function unpublishNote(id: string) {
  return apiRequest<AdminNote>(`/api/admin/notes/${encodeURIComponent(id)}/unpublish`, { method: 'PATCH' })
}

export function uploadCoverImage(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiRequest<AdminNote>(`/api/admin/notes/${encodeURIComponent(id)}/cover-image`, {
    method: 'POST',
    body: form,
  })
}

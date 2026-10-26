import { knownBlocks, type PublicNote, type PublicNoteSummary } from './types'

// The only configuration the app has. Public by design (baked into the bundle); never a
// secret. Plain HTTP to the VPS during testing, HTTPS at release.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8081').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(0, 'No connection')
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      message = ((await response.json()) as { message?: string }).message ?? message
    } catch {
      // Not JSON; keep the generic message.
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}

export const queryKeys = {
  notes: ['notes'] as const,
  latest: ['notes', 'latest'] as const,
  note: (id: string) => ['note', id] as const,
}

// Every published note (summaries only). The archive and "this Sunday" both use it.
export function listNotes() {
  return getJson<PublicNoteSummary[]>('/api/notes')
}

export async function getNote(id: string): Promise<PublicNote> {
  const note = await getJson<PublicNote>(`/api/notes/${encodeURIComponent(id)}`)
  return { ...note, blocks: knownBlocks(note.blocks) }
}

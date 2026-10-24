// Mirrors the backend DTOs documented in docs/API.md. Keep the two in sync.

export type BlockType = 'HEADING' | 'SCRIPTURE' | 'PARAGRAPH' | 'LIST' | 'REFLECTION'
export type TextAlign = 'LEFT' | 'CENTER'
export type NoteStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED'

// A segment is either plain text or a blank (PLAN §4).
export type TextSegment = { text: string }
export type BlankSegment = { blankId: string; answer: string }
export type Segment = TextSegment | BlankSegment

export type HeadingBlock = { id: string; type: 'HEADING'; segments: Segment[]; numbered: boolean }
export type ScriptureBlock = { id: string; type: 'SCRIPTURE'; text: string; reference: string }
export type ParagraphBlock = { id: string; type: 'PARAGRAPH'; segments: Segment[]; align: TextAlign }
export type ListBlock = { id: string; type: 'LIST'; items: Segment[][] }
export type ReflectionBlock = { id: string; type: 'REFLECTION'; prompt: string }

export type NoteBlock = HeadingBlock | ScriptureBlock | ParagraphBlock | ListBlock | ReflectionBlock

export type AdminAccount = {
  id: string
  email: string
  displayName: string
  role: 'ADMIN'
}

export type AuthResponse = {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  admin: AdminAccount
}

export type AdminNoteSummary = {
  id: string
  title: string
  preacherName: string
  sermonDate: string
  coverImageUrl: string | null
  contentVersion: number
  publishAt: string | null
  status: NoteStatus
}

export type AdminNote = AdminNoteSummary & {
  blocks: NoteBlock[]
  createdAt: string
  updatedAt: string
}

// Body of POST and PUT /api/admin/notes. The backend rejects any other field.
export type NoteInput = {
  title: string
  sermonDate: string
  preacherName: string
  blocks: NoteBlock[]
}

export type ApiErrorBody = {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
}

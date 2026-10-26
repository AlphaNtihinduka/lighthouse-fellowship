// Mirrors the public part of docs/API.md and the content format of PLAN §4. Keep in
// sync with dashboard/src/api/types.ts. Unknown block types from a newer backend are
// skipped by the reader, never a crash (ADR 0002): installed apps can't be force-updated.

export type TextSegment = { text: string }
export type BlankSegment = { blankId: string; answer: string }
export type Segment = TextSegment | BlankSegment

export type HeadingBlock = { id: string; type: 'HEADING'; segments: Segment[]; numbered: boolean }
export type ScriptureBlock = { id: string; type: 'SCRIPTURE'; text: string; reference: string }
export type ParagraphBlock = { id: string; type: 'PARAGRAPH'; segments: Segment[]; align: 'LEFT' | 'CENTER' }
export type ListBlock = { id: string; type: 'LIST'; items: Segment[][] }
export type ReflectionBlock = { id: string; type: 'REFLECTION'; prompt: string }

export type NoteBlock = HeadingBlock | ScriptureBlock | ParagraphBlock | ListBlock | ReflectionBlock

export type PublicNoteSummary = {
  id: string
  title: string
  sermonDate: string
  coverImageUrl: string | null
  contentVersion: number
}

export type PublicNote = {
  id: string
  title: string
  preacherName: string
  sermonDate: string
  coverImageUrl: string | null
  contentVersion: number
  blocks: NoteBlock[]
}

const KNOWN_TYPES = new Set(['HEADING', 'SCRIPTURE', 'PARAGRAPH', 'LIST', 'REFLECTION'])

// Drops blocks this version of the app doesn't know how to draw.
export function knownBlocks(blocks: unknown[]): NoteBlock[] {
  return blocks.filter(
    (block): block is NoteBlock =>
      typeof block === 'object' && block !== null && KNOWN_TYPES.has((block as { type?: string }).type ?? ''),
  )
}

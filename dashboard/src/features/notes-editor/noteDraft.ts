import type { AdminNote, BlockType, NoteBlock, NoteInput, Segment } from '../../api/types'
import { cleanSegments, ensureEditable, isBlank, isText, MAX_ANSWER_LENGTH, MAX_ANSWER_WORDS } from './segments'

export const DEFAULT_PREACHER = 'Pastor Joe Benecasa'

export type NoteDraft = NoteInput

export const BLOCK_LABELS: Record<BlockType, string> = {
  HEADING: 'Heading',
  SCRIPTURE: 'Scripture',
  PARAGRAPH: 'Paragraph',
  LIST: 'Numbered list',
  REFLECTION: 'Reflection',
}

// Short, stable, URL-safe ids. Generated once when a block or blank is created and
// never renumbered: game attempts and personal notes point at them (ADR 0002).
export function newId(prefix: 'b' | 'k', taken: Set<string>): string {
  for (;;) {
    const id = `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
    if (!taken.has(id)) {
      return id
    }
  }
}

export function collectIds(blocks: NoteBlock[]): Set<string> {
  const ids = new Set<string>()
  for (const block of blocks) {
    ids.add(block.id)
    for (const line of linesOf(block)) {
      for (const segment of line) {
        if (isBlank(segment)) ids.add(segment.blankId)
      }
    }
  }
  return ids
}

export function linesOf(block: NoteBlock): Segment[][] {
  switch (block.type) {
    case 'HEADING':
    case 'PARAGRAPH':
      return [block.segments]
    case 'LIST':
      return block.items
    default:
      return []
  }
}

export function emptyBlock(type: BlockType, id: string): NoteBlock {
  switch (type) {
    case 'HEADING':
      return { id, type, numbered: true, segments: [{ text: '' }] }
    case 'SCRIPTURE':
      return { id, type, text: '', reference: '' }
    case 'PARAGRAPH':
      return { id, type, align: 'LEFT', segments: [{ text: '' }] }
    case 'LIST':
      return { id, type, items: [[{ text: '' }]] }
    case 'REFLECTION':
      return { id, type, prompt: '' }
  }
}

export function newDraft(sermonDate: string): NoteDraft {
  return { title: '', sermonDate, preacherName: DEFAULT_PREACHER, blocks: [] }
}

// Server note → editor state (lines get their typing placeholders).
export function draftFromNote(note: AdminNote): NoteDraft {
  return {
    title: note.title,
    sermonDate: note.sermonDate,
    preacherName: note.preacherName,
    blocks: note.blocks.map(mapLines(ensureEditable)),
  }
}

// Editor state → request body (placeholders removed, text fields trimmed like the server does).
export function draftToInput(draft: NoteDraft): NoteInput {
  return {
    title: draft.title.trim(),
    sermonDate: draft.sermonDate,
    preacherName: draft.preacherName.trim() || DEFAULT_PREACHER,
    blocks: draft.blocks.map((block) => {
      const cleaned = mapLines(cleanSegments)(block)
      if (cleaned.type === 'SCRIPTURE') {
        return { ...cleaned, text: cleaned.text.trim(), reference: cleaned.reference.trim() }
      }
      if (cleaned.type === 'REFLECTION') {
        return { ...cleaned, prompt: cleaned.prompt.trim() }
      }
      return cleaned
    }),
  }
}

function mapLines(transform: (line: Segment[]) => Segment[]) {
  return (block: NoteBlock): NoteBlock => {
    switch (block.type) {
      case 'HEADING':
      case 'PARAGRAPH':
        return { ...block, segments: transform(block.segments) }
      case 'LIST':
        return { ...block, items: block.items.map(transform) }
      default:
        return block
    }
  }
}

export type DraftProblem = { blockId?: string; field?: 'title' | 'sermonDate' | 'preacherName'; message: string }

const MAX_BLOCKS = 200
const MAX_TOTAL_CHARACTERS = 50_000

export function isSunday(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Boolean(year && month && day) && new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0
}

/**
 * The same rules as the backend's NoteContentValidator and SermonNoteRequestDTO, so the
 * admin sees problems next to the block before saving. The server still checks
 * everything; its 400 message is shown too.
 */
export function validateDraft(draft: NoteDraft): DraftProblem[] {
  const input = draftToInput(draft)
  const problems: DraftProblem[] = []

  if (!input.title) problems.push({ field: 'title', message: 'Give the note a title.' })
  if (input.title.length > 200) problems.push({ field: 'title', message: 'The title is longer than 200 characters.' })
  if (!isSunday(input.sermonDate)) problems.push({ field: 'sermonDate', message: 'Choose a Sunday.' })
  if (input.preacherName.length > 120) {
    problems.push({ field: 'preacherName', message: "The preacher's name is longer than 120 characters." })
  }
  if (input.blocks.length > MAX_BLOCKS) problems.push({ message: `A note can have at most ${MAX_BLOCKS} blocks.` })

  let totalCharacters = 0
  input.blocks.forEach((block, index) => {
    const label = `Block ${index + 1} (${BLOCK_LABELS[block.type]})`
    const problem = (message: string) => problems.push({ blockId: block.id, message: `${label}: ${message}` })

    if (block.type === 'SCRIPTURE') {
      if (!block.text) problem('add the scripture text.')
      if (!block.reference) problem('add the reference, e.g. "1 Samuel 17:40-47".')
      totalCharacters += block.text.length + block.reference.length
    } else if (block.type === 'REFLECTION') {
      if (!block.prompt) problem('add the question.')
      totalCharacters += block.prompt.length
    } else {
      const lines = linesOf(block)
      if (block.type === 'LIST' && lines.length === 0) problem('add at least one item.')
      lines.forEach((line, lineIndex) => {
        const where = block.type === 'LIST' ? `item ${lineIndex + 1} ` : ''
        const visible = line.some((segment) => isBlank(segment) || segment.text.trim() !== '')
        if (!visible) problem(`${where}is empty.`)
        for (const segment of line) {
          if (isText(segment)) {
            totalCharacters += segment.text.length
          } else {
            const words = segment.answer.trim().split(/\s+/).filter(Boolean).length
            if (words === 0 || words > MAX_ANSWER_WORDS) problem(`a blank must be 1 to 3 words ("${segment.answer}").`)
            if (segment.answer.length > MAX_ANSWER_LENGTH) problem('a blank is longer than 60 characters.')
            totalCharacters += segment.answer.length
          }
        }
      })
    }
  })

  if (totalCharacters > MAX_TOTAL_CHARACTERS) {
    problems.push({ message: `The note is too long (at most ${MAX_TOTAL_CHARACTERS} characters of text).` })
  }
  return problems
}

// The backend names the block id in its messages ("Block 3 (b-abc) SCRIPTURE: ...").
export function blockIdInServerMessage(message: string, blocks: NoteBlock[]): string | undefined {
  const match = message.match(/^Block \d+ \(([A-Za-z0-9_-]{1,40})\)/)
  return match && blocks.some((block) => block.id === match[1]) ? match[1] : undefined
}

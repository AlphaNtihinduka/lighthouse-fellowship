import { describe, expect, it } from 'vitest'
import type { AdminNote } from '../../api/types'
import {
  blockIdInServerMessage,
  collectIds,
  draftFromNote,
  draftToInput,
  emptyBlock,
  isSunday,
  newDraft,
  newId,
  validateDraft,
} from './noteDraft'

const note: AdminNote = {
  id: 'n1',
  title: 'Seeing Jesus in David',
  preacherName: 'Pastor Joe Benecasa',
  sermonDate: '2026-09-20',
  coverImageUrl: null,
  contentVersion: 3,
  publishAt: null,
  status: 'DRAFT',
  createdAt: '2026-09-10T10:00:00Z',
  updatedAt: '2026-09-10T10:00:00Z',
  blocks: [
    { id: 'b1', type: 'SCRIPTURE', text: 'Man looks at the outward appearance.', reference: '1st Samuel 16:7' },
    {
      id: 'b2',
      type: 'HEADING',
      numbered: true,
      segments: [
        { text: 'David and Jesus were both ' },
        { blankId: 'k5', answer: 'unexpected' },
        { text: ' ' },
        { blankId: 'k6', answer: 'kings' },
        { text: '.' },
      ],
    },
    { id: 'b3', type: 'LIST', items: [[{ text: 'Saul was the man they ' }, { blankId: 'k7', answer: 'wanted' }]] },
    { id: 'b4', type: 'REFLECTION', prompt: 'What is God showing me?' },
  ],
}

describe('draft round trip', () => {
  it('loading a note and saving it unchanged sends exactly the same content', () => {
    const input = draftToInput(draftFromNote(note))
    expect(input).toEqual({
      title: note.title,
      sermonDate: note.sermonDate,
      preacherName: note.preacherName,
      blocks: note.blocks,
    })
  })

  it('keeps every block and blank id', () => {
    expect([...collectIds(draftToInput(draftFromNote(note)).blocks)].sort()).toEqual(
      ['b1', 'b2', 'b3', 'b4', 'k5', 'k6', 'k7'].sort(),
    )
  })

  it('fills in the default preacher when left blank', () => {
    expect(draftToInput({ ...newDraft('2026-09-13'), title: 'x', preacherName: '  ' }).preacherName).toBe(
      'Pastor Joe Benecasa',
    )
  })
})

describe('validateDraft', () => {
  it('accepts a complete note', () => {
    expect(validateDraft(draftFromNote(note))).toEqual([])
  })

  it('names what is missing, block by block', () => {
    const draft = {
      ...newDraft('2026-09-14'),
      blocks: [emptyBlock('SCRIPTURE', 'b1'), emptyBlock('PARAGRAPH', 'b2'), emptyBlock('REFLECTION', 'b3')],
    }
    const messages = validateDraft(draft).map((problem) => problem.message)
    expect(messages).toEqual([
      'Give the note a title.',
      'Choose a Sunday.',
      'Block 1 (Scripture): add the scripture text.',
      'Block 1 (Scripture): add the reference, e.g. "1 Samuel 17:40-47".',
      'Block 2 (Paragraph): is empty.',
      'Block 3 (Reflection): add the question.',
    ])
    expect(validateDraft(draft).find((p) => p.message.startsWith('Block 2'))?.blockId).toBe('b2')
  })

  it('refuses a blank of four words', () => {
    const draft = {
      ...newDraft('2026-09-13'),
      title: 'x',
      blocks: [{ id: 'b1', type: 'PARAGRAPH' as const, align: 'LEFT' as const, segments: [{ blankId: 'k1', answer: 'one two three four' }] }],
    }
    expect(validateDraft(draft)[0].message).toContain('1 to 3 words')
  })
})

describe('helpers', () => {
  it('knows Sundays', () => {
    expect(isSunday('2026-09-13')).toBe(true)
    expect(isSunday('2026-09-14')).toBe(false)
    expect(isSunday('')).toBe(false)
  })

  it('generates ids the backend accepts and never repeats one in use', () => {
    const taken = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const id = newId(i % 2 ? 'b' : 'k', taken)
      expect(id).toMatch(/^[A-Za-z0-9_-]{1,40}$/)
      expect(taken.has(id)).toBe(false)
      taken.add(id)
    }
  })

  it('finds the block a server message is about', () => {
    expect(blockIdInServerMessage('Block 2 (b2) HEADING: segments, segment 1: ...', note.blocks)).toBe('b2')
    expect(blockIdInServerMessage('Block 9 (zz) HEADING: ...', note.blocks)).toBeUndefined()
    expect(blockIdInServerMessage('title: must not be blank', note.blocks)).toBeUndefined()
  })
})

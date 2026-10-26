import { describe, expect, it } from '@jest/globals'
import type { NoteBlock } from '../../api/types'
import { toRenderItems } from '../reader/renderItems'
import { blankWidth, blanksOf, pageBank, place, removeFromBlank, scoreNote, shuffle, type Blank } from './game'

const blocks: NoteBlock[] = [
  {
    id: 'p1',
    type: 'PARAGRAPH',
    align: 'CENTER',
    segments: [{ text: 'not ' }, { blankId: 'k1', answer: 'if' }, { text: ' we ' }, { blankId: 'k2', answer: 'face' }],
  },
  { id: 's1', type: 'SCRIPTURE', text: 'Text.', reference: 'Ref' },
  { id: 'h1', type: 'HEADING', numbered: true, segments: [{ text: 'under God’s ' }, { blankId: 'k3', answer: 'authority' }] },
  {
    id: 'l1',
    type: 'LIST',
    items: [
      [{ text: 'the man they ' }, { blankId: 'k4', answer: 'wanted' }],
      [{ text: 'the man He ' }, { blankId: 'k5', answer: 'wanted' }],
    ],
  },
]
const blanks = blanksOf(toRenderItems(blocks))

describe('blanksOf', () => {
  it('finds blanks in reading order in paragraphs, headings and list items', () => {
    expect(blanks.map((b) => b.blankId)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5'])
  })
})

describe('pageBank', () => {
  it('holds exactly the answers of that page, shuffled and stable', () => {
    const page = blanks.slice(0, 3)
    const bank = pageBank(page, {}, 'note:0')
    expect(bank.map((c) => c.answer).sort()).toEqual(['authority', 'face', 'if'])
    expect(bank.map((c) => c.answer)).not.toEqual(['if', 'face', 'authority'])
    expect(pageBank(page, {}, 'note:0')).toEqual(bank)
  })

  it('drops chips already placed', () => {
    const bank = pageBank(blanks.slice(0, 3), { k3: 'k1' }, 'note:0')
    expect(bank.map((c) => c.chipId).sort()).toEqual(['k2', 'k3'])
  })

  it('is empty for a page without blanks', () => {
    expect(pageBank([], {}, 'note:1')).toEqual([])
  })
})

describe('shuffle', () => {
  it('never returns several items in their original order', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      expect(shuffle([1, 2], seed)).toEqual([2, 1])
    }
  })
})

describe('place / removeFromBlank', () => {
  it('moves a chip from one blank to another', () => {
    expect(place({ k1: 'k2' }, 'k2', 'k3')).toEqual({ k3: 'k2' })
  })

  it('replacing a chip sends the old one back to the tray', () => {
    expect(place({ k1: 'k2' }, 'k1', 'k1')).toEqual({ k1: 'k1' })
  })

  it('removes a chip from a blank', () => {
    expect(removeFromBlank({ k1: 'k2', k3: 'k3' }, 'k1')).toEqual({ k3: 'k3' })
  })
})

describe('scoreNote', () => {
  it('scores the whole note; empty blanks are wrong', () => {
    const score = scoreNote(blanks, { k1: 'k1', k2: 'k3', k3: 'k2' })
    expect(score.correct).toBe(1)
    expect(score.total).toBe(5)
    expect(score.results.find((r) => r.blankId === 'k2')).toEqual({ blankId: 'k2', answer: 'face', placed: 'authority', correct: false })
    expect(score.results.find((r) => r.blankId === 'k4')?.placed).toBeNull()
  })

  it('accepts either chip in two blanks with the same answer', () => {
    expect(scoreNote(blanks, { k4: 'k5', k5: 'k4' }).correct).toBe(2)
  })

  it('ignores case, spacing and curly apostrophes', () => {
    const odd: Blank[] = [{ blankId: 'a', answer: "God's  Word" }, { blankId: 'b', answer: 'god’s word' }]
    expect(scoreNote(odd, { a: 'b', b: 'a' }).correct).toBe(2)
  })
})

describe('blankWidth', () => {
  it('is the same for every blank, sized by the longest answer, within limits', () => {
    expect(blankWidth([{ blankId: 'a', answer: 'if' }])).toBe(72)
    expect(blankWidth(blanks)).toBe(Math.round('authority'.length * 8.2 + 16))
    expect(blankWidth([{ blankId: 'a', answer: 'overcame these attacks today' }])).toBe(170)
    expect(blankWidth([{ blankId: 'a', answer: 'if' }], 1.5)).toBe(108)
  })
})

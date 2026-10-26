import { describe, expect, it } from '@jest/globals'
import type { NoteBlock } from '../../api/types'
import { scriptureText, splitItem, toRenderItems, toRoman } from './renderItems'

const blocks: NoteBlock[] = [
  { id: 's1', type: 'SCRIPTURE', text: 'He took his staff. He chose five stones.', reference: '1 Samuel 17:40' },
  { id: 'h1', type: 'HEADING', numbered: true, segments: [{ text: 'God will prepare us.' }] },
  { id: 'h2', type: 'HEADING', numbered: false, segments: [{ text: "Let's be clear!" }] },
  { id: 'h3', type: 'HEADING', numbered: true, segments: [{ text: 'There will be giants.' }] },
]

describe('toRenderItems', () => {
  it('numbers only numbered headings, across the whole note', () => {
    const items = toRenderItems(blocks)
    expect(items.map((item) => (item.kind === 'block' ? item.headingNumber ?? '-' : 'S'))).toEqual(['S', 'I', '-', 'II'])
  })

  it('roman numerals as on the sheet', () => {
    expect([1, 2, 3, 4, 5, 9, 12].map(toRoman)).toEqual(['I', 'II', 'III', 'IV', 'V', 'IX', 'XII'])
  })
})

describe('splitItem', () => {
  it('splits a scripture into a first part without the reference and a continuation', () => {
    const items = splitItem(toRenderItems(blocks), 's1', 18)
    const [first, second] = items
    expect(first).toMatchObject({ key: 's1.a', text: 'He took his staff.', isFirst: true, isLast: false })
    expect(second).toMatchObject({ key: 's1.b', text: 'He chose five stones.', isFirst: false, isLast: true })
    if (first.kind !== 'scripture-part' || second.kind !== 'scripture-part') throw new Error('expected parts')
    expect(scriptureText(first)).toBe('“He took his staff.')
    expect(scriptureText(second)).toBe('He chose five stones.”')
    expect(items).toHaveLength(5)
  })

  it('can split a part again', () => {
    const once = splitItem(toRenderItems(blocks), 's1', 18)
    const twice = splitItem(once, 's1.b', 9)
    expect(twice.slice(0, 3).map((item) => item.key)).toEqual(['s1.a', 's1.b.a', 's1.b.b'])
  })

  it('ignores a split that would leave an empty part', () => {
    const items = toRenderItems(blocks)
    expect(splitItem(items, 's1', 0)).toEqual(items)
  })
})

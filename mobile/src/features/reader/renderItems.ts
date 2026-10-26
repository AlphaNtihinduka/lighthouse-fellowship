import type { NoteBlock, ScriptureBlock } from '../../api/types'

// What sits on a page: a whole block, or one part of a scripture passage split across
// pages. Heading numbers are counted over the whole note, not per page (I, II, III…).
export type RenderItem =
  | { key: string; kind: 'block'; block: NoteBlock; headingNumber?: string }
  | {
      key: string
      kind: 'scripture-part'
      blockId: string
      text: string
      // The opening quote is on the first part, the closing quote and the reference
      // on the last one, as if the passage had simply continued on the next page.
      isFirst: boolean
      isLast: boolean
      reference: string
    }

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(n: number): string {
  let rest = n
  let out = ''
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol
      rest -= value
    }
  }
  return out
}

export function toRenderItems(blocks: NoteBlock[]): RenderItem[] {
  let headings = 0
  return blocks.map((block) => {
    if (block.type === 'SCRIPTURE') {
      return scripturePart(block, block.text, true, true, block.id)
    }
    if (block.type === 'HEADING' && block.numbered) {
      headings += 1
      return { key: block.id, kind: 'block', block, headingNumber: toRoman(headings) }
    }
    return { key: block.id, kind: 'block', block }
  })
}

function scripturePart(block: ScriptureBlock, text: string, isFirst: boolean, isLast: boolean, key: string): RenderItem {
  return { key, kind: 'scripture-part', blockId: block.id, text, isFirst, isLast, reference: block.reference }
}

// Replaces the scripture part `key` by two parts split at character `at`.
export function splitItem(items: RenderItem[], key: string, at: number): RenderItem[] {
  return items.flatMap((item) => {
    if (item.key !== key || item.kind !== 'scripture-part') return [item]
    const head = item.text.slice(0, at).trimEnd()
    const tail = item.text.slice(at).trimStart()
    if (!head || !tail) return [item]
    return [
      { ...item, key: `${key}.a`, text: head, isLast: false },
      { ...item, key: `${key}.b`, text: tail, isFirst: false },
    ]
  })
}

// The text actually printed for a scripture part, with the quote marks it gets.
export function scriptureText(item: Extract<RenderItem, { kind: 'scripture-part' }>): string {
  return `${item.isFirst ? '“' : ''}${item.text}${item.isLast ? '”' : ''}`
}

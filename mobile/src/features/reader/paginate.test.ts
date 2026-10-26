import { describe, expect, it } from '@jest/globals'
import { chooseSplit, planPages, sentenceEnds, type LineInfo, type MeasuredUnit } from './paginate'

const unit = (key: string, height: number, extra: Partial<MeasuredUnit> = {}): MeasuredUnit => ({ key, height, ...extra })

// A text laid out as fixed 20px lines (line n ends at the given character).
function lines(ends: number[], lineHeight = 20, top = 0): LineInfo[] {
  return ends.map((end, index) => ({ end, bottom: top + (index + 1) * lineHeight }))
}

describe('sentenceEnds', () => {
  it('finds sentence ends inside the text, not the final one', () => {
    const text = 'He took his staff. He chose five stones! Was it enough? Yes.'
    expect(sentenceEnds(text).map((at) => text.slice(0, at).slice(-6))).toEqual(['staff.', 'tones!', 'nough?'])
  })

  it('keeps closing quotes with the sentence', () => {
    const text = '“Am I a dog?” he said. Then he left.'
    expect(sentenceEnds(text).map((at) => text.slice(0, at))).toEqual(['“Am I a dog?”', '“Am I a dog?” he said.'])
  })
})

describe('chooseSplit', () => {
  // Four lines; sentences end at 30 (line 2) and 70 (line 4 is the last, ends at 80).
  const text = 'a'.repeat(29) + '. ' + 'b'.repeat(38) + '. ' + 'c'.repeat(9)
  const split = { text, lines: lines([20, 40, 60, 80]) }

  it('splits at the last sentence end that fits', () => {
    expect(chooseSplit(split, 70)).toBe(30) // sentence 1 needs lines 1–2 = 40px
  })

  it('falls back to a line end when no sentence fits', () => {
    expect(chooseSplit(split, 25)).toBe(20)
  })

  it('returns null when not even one line fits', () => {
    expect(chooseSplit(split, 10)).toBeNull()
  })
})

describe('planPages', () => {
  it('packs blocks in order and starts a new page when the next block does not fit', () => {
    const plan = planPages([unit('a', 300), unit('b', 300), unit('c', 300), unit('d', 100)], 700)
    expect(plan).toEqual({ kind: 'pages', pages: [['a', 'b'], ['c', 'd']] })
  })

  it('a page height change repaginates (phone vs tablet)', () => {
    const units = [unit('a', 300), unit('b', 300), unit('c', 300), unit('d', 100)]
    expect(planPages(units, 1000)).toEqual({ kind: 'pages', pages: [['a', 'b', 'c', 'd']] })
  })

  it('never leaves a heading alone at the bottom of a page', () => {
    const plan = planPages([unit('p', 550), unit('h', 60, { keepWithNext: true }), unit('q', 200)], 700)
    expect(plan).toEqual({ kind: 'pages', pages: [['p'], ['h', 'q']] })
  })

  it('keeps a heading at the bottom when the first line of what follows still fits', () => {
    const scripture = unit('s', 900, { split: { text: 'x'.repeat(100), lines: lines([10, 20, 30, 40, 50]) } })
    const plan = planPages([unit('p', 550), unit('h', 60, { keepWithNext: true }), scripture], 700)
    // 550 + 60 + first line (20) fits, so the heading stays and the scripture is split here.
    expect(plan.kind).toBe('split')
  })

  it('splits a scripture taller than a page at a sentence end, filling the current page', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Sentence ${i} is here.`).join(' ')
    const ends = sentenceEnds(text)
    // One sentence per 40px line pair: sentence i ends on line 2i+2.
    const lineInfo = ends.map((end, i) => ({ end, bottom: (i + 1) * 40 })).concat([{ end: text.length, bottom: 400 + 40 }])
    const plan = planPages([unit('intro', 500), unit('s', 440, { split: { text, lines: lineInfo } })], 420)

    // The intro (500) overflows the 420px page on its own and can't be split, so nothing
    // is left there; the scripture is cut to fill a whole fresh page.
    expect(plan.kind).toBe('split')
    if (plan.kind === 'split') {
      expect(plan.key).toBe('s')
      expect(text.slice(0, plan.at).endsWith('.')).toBe(true)
    }
  })

  it('splits a scripture taller than a page to fill the space left on the current page', () => {
    const text = 'One. Two. Three. Four. Five. Six. Seven.'
    const lineInfo = lines([4, 9, 16, 22, 28, 33, 40], 100) // one sentence per 100px line: 700px
    const plan = planPages([unit('a', 350), unit('s', 700, { split: { text, lines: lineInfo } })], 600)
    // 250px left on page 1: "One. Two." (two lines, 200px) fits, "Three." would not.
    expect(plan).toEqual({ kind: 'split', key: 's', at: 9 })
  })

  it('moves a scripture that fits on a page to the next page whole instead of cutting it', () => {
    const text = 'One. Two. Three.'
    const plan = planPages([unit('a', 500), unit('s', 300, { split: { text, lines: lines([5, 10, 16], 100) } })], 700)
    expect(plan).toEqual({ kind: 'pages', pages: [['a'], ['s']] })
  })

  it('gives an unsplittable block taller than a page its own page', () => {
    expect(planPages([unit('a', 100), unit('big', 900), unit('b', 100)], 700)).toEqual({
      kind: 'pages',
      pages: [['a'], ['big'], ['b']],
    })
  })

  it('returns no pages for an empty note', () => {
    expect(planPages([], 700)).toEqual({ kind: 'pages', pages: [] })
  })
})

import { describe, expect, it } from 'vitest'
import type { Segment } from '../../api/types'
import { checkBlankSelection, cleanSegments, ensureEditable, makeBlank, removeBlank } from './segments'

function blankFrom(text: string, selected: string, blankId = 'k1') {
  const start = text.indexOf(selected)
  const selection = checkBlankSelection(text, start, start + selected.length)
  if (!selection.ok) {
    throw new Error(selection.reason)
  }
  return makeBlank([{ text }], 0, selection, blankId)
}

describe('checkBlankSelection', () => {
  const text = 'The question is not if we are going to face giants, but how.'
  const select = (selected: string) => {
    const start = text.indexOf(selected)
    return checkBlankSelection(text, start, start + selected.length)
  }

  it('accepts one, two and three whole words', () => {
    expect(select('face')).toMatchObject({ ok: true, answer: 'face' })
    expect(select('face giants')).toMatchObject({ ok: true, answer: 'face giants' })
    expect(select('going to face')).toMatchObject({ ok: true, answer: 'going to face' })
  })

  it('refuses four words', () => {
    expect(select('are going to face')).toEqual({ ok: false, reason: 'A blank is 1 to 3 words (this is 4).' })
  })

  it('drops surrounding spaces and punctuation', () => {
    expect(select(' giants, ')).toMatchObject({ ok: true, answer: 'giants' })
    expect(select('how.')).toMatchObject({ ok: true, answer: 'how' })
  })

  it('refuses part of a word', () => {
    expect(select('gian')).toMatchObject({ ok: false, reason: 'Select whole words, not part of a word.' })
    expect(select('iants')).toMatchObject({ ok: false })
  })

  it('refuses an empty or whitespace selection', () => {
    expect(checkBlankSelection(text, 5, 5)).toMatchObject({ ok: false })
    expect(select(', ')).toMatchObject({ ok: false })
  })

  it('works with a selection made backwards', () => {
    const start = text.indexOf('face')
    expect(checkBlankSelection(text, start + 4, start)).toMatchObject({ ok: true, answer: 'face' })
  })

  it('keeps apostrophes inside a word', () => {
    const line = "remained under God's authority"
    const start = line.indexOf("God's")
    expect(checkBlankSelection(line, start, start + 5)).toMatchObject({ ok: true, answer: "God's" })
    expect(checkBlankSelection(line, start, start + 3)).toMatchObject({ ok: false })
  })
})

describe('makeBlank / removeBlank', () => {
  it('splits text into text / blank / text', () => {
    expect(blankFrom('we are going to face giants.', 'face')).toEqual([
      { text: 'we are going to ' },
      { blankId: 'k1', answer: 'face' },
      { text: ' giants.' },
    ])
  })

  it('makes two blanks side by side', () => {
    const first = blankFrom('both unexpected kings.', 'unexpected')
    const after = (first[2] as { text: string }).text // " kings."
    const selection = checkBlankSelection(after, 1, 6)
    if (!selection.ok) throw new Error(selection.reason)
    const segments = makeBlank(first, 2, selection, 'k2')

    expect(cleanSegments(segments)).toEqual([
      { text: 'both ' },
      { blankId: 'k1', answer: 'unexpected' },
      { text: ' ' },
      { blankId: 'k2', answer: 'kings' },
      { text: '.' },
    ])
  })

  it('a blank at the very start or end still leaves a place to type', () => {
    const segments = blankFrom('Authority', 'Authority')
    expect(segments).toEqual([{ text: '' }, { blankId: 'k1', answer: 'Authority' }, { text: '' }])
    expect(cleanSegments(segments)).toEqual([{ blankId: 'k1', answer: 'Authority' }])
  })

  it('turns a blank back into text, merged with its neighbours', () => {
    const segments = blankFrom('we are going to face giants.', 'face')
    expect(removeBlank(segments, 1)).toEqual([{ text: 'we are going to face giants.' }])
  })

  it('keeps other blank ids unchanged when one is removed', () => {
    const segments: Segment[] = [
      { text: 'a ' },
      { blankId: 'k1', answer: 'one' },
      { text: ' b ' },
      { blankId: 'k2', answer: 'two' },
    ]
    expect(cleanSegments(removeBlank(segments, 1))).toEqual([{ text: 'a one b ' }, { blankId: 'k2', answer: 'two' }])
  })
})

describe('ensureEditable', () => {
  it('adds typing places around and between blanks, and merges text', () => {
    expect(
      ensureEditable([
        { blankId: 'k1', answer: 'one' },
        { blankId: 'k2', answer: 'two' },
        { text: 'a' },
        { text: 'b' },
      ]),
    ).toEqual([
      { text: '' },
      { blankId: 'k1', answer: 'one' },
      { text: '' },
      { blankId: 'k2', answer: 'two' },
      { text: 'ab' },
    ])
  })

  it('turns an empty line into one empty text segment', () => {
    expect(ensureEditable([])).toEqual([{ text: '' }])
  })
})

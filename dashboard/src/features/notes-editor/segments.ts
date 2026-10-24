import type { BlankSegment, Segment, TextSegment } from '../../api/types'

// A "line" is the segment list of a heading, a paragraph or one list item. Blanks
// behave the same in all three (PLAN §4).

export const MAX_ANSWER_WORDS = 3
export const MAX_ANSWER_LENGTH = 60

export const isBlank = (segment: Segment): segment is BlankSegment => 'blankId' in segment
export const isText = (segment: Segment): segment is TextSegment => 'text' in segment

const WORD_CHAR = /[\p{L}\p{N}'’-]/u
const EDGE_PUNCTUATION = /[\s.,;:!?"“”()]/u

export type BlankSelection =
  | { ok: true; start: number; end: number; answer: string }
  | { ok: false; reason: string }

/**
 * Checks a selection inside one text segment. Surrounding spaces and punctuation are
 * dropped ("giants," → "giants"), then it must be 1–3 whole words: selecting half a
 * word ("gian|ts") would leave a strange half-word next to the blank.
 */
export function checkBlankSelection(text: string, start: number, end: number): BlankSelection {
  let from = Math.max(0, Math.min(start, end))
  let to = Math.min(text.length, Math.max(start, end))
  while (from < to && EDGE_PUNCTUATION.test(text[from])) from++
  while (to > from && EDGE_PUNCTUATION.test(text[to - 1])) to--

  if (from === to) {
    return { ok: false, reason: 'Select the word or words that should become the blank.' }
  }
  if ((from > 0 && WORD_CHAR.test(text[from - 1])) || (to < text.length && WORD_CHAR.test(text[to]))) {
    return { ok: false, reason: 'Select whole words, not part of a word.' }
  }
  const answer = text.slice(from, to).replace(/\s+/g, ' ')
  const words = answer.split(' ').length
  if (words > MAX_ANSWER_WORDS) {
    return { ok: false, reason: `A blank is 1 to 3 words (this is ${words}).` }
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return { ok: false, reason: `A blank is at most ${MAX_ANSWER_LENGTH} characters.` }
  }
  return { ok: true, start: from, end: to, answer }
}

// Splits the text segment at `index` into text / blank / text.
export function makeBlank(
  segments: Segment[],
  index: number,
  selection: Extract<BlankSelection, { ok: true }>,
  blankId: string,
): Segment[] {
  const segment = segments[index]
  if (!segment || !isText(segment)) {
    return segments
  }
  const before = segment.text.slice(0, selection.start)
  const after = segment.text.slice(selection.end)
  return ensureEditable([
    ...segments.slice(0, index),
    { text: before },
    { blankId, answer: selection.answer },
    { text: after },
    ...segments.slice(index + 1),
  ])
}

// Turns a blank back into plain text, merged with the text on either side. The
// blank id is simply dropped; it is never reused for another blank.
export function removeBlank(segments: Segment[], index: number): Segment[] {
  const segment = segments[index]
  if (!segment || !isBlank(segment)) {
    return segments
  }
  return ensureEditable([...segments.slice(0, index), { text: segment.answer }, ...segments.slice(index + 1)])
}

/**
 * Editor form of a line: adjacent text segments merged, and an (possibly empty) text
 * segment before, after and between blanks, so there is always somewhere to type.
 */
export function ensureEditable(segments: Segment[]): Segment[] {
  const result: Segment[] = []
  for (const segment of segments) {
    const last = result.at(-1)
    if (isText(segment)) {
      if (last && isText(last)) {
        result[result.length - 1] = { text: last.text + segment.text }
      } else {
        result.push({ text: segment.text })
      }
    } else {
      if (!last || isBlank(last)) {
        result.push({ text: '' })
      }
      result.push(segment)
    }
  }
  if (result.length === 0 || isBlank(result[result.length - 1])) {
    result.push({ text: '' })
  }
  return result
}

// Saved form of a line: the empty placeholders from ensureEditable removed (the
// backend rejects empty text segments).
export function cleanSegments(segments: Segment[]): Segment[] {
  return segments.filter((segment) => !(isText(segment) && segment.text === ''))
}

export function setSegmentText(segments: Segment[], index: number, text: string): Segment[] {
  return segments.map((segment, i) => (i === index && isText(segment) ? { text } : segment))
}

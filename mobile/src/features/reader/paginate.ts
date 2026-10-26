// Packs measured blocks into pages. Pure TypeScript with no React or React Native, so
// the dashboard preview can use the same file and get the same pages (mobile-app-builder
// skill). Heights come from a hidden measuring pass at the real page width and font scale.

export type LineInfo = {
  // Index just past the last character of this line in the unit's text.
  end: number
  // Bottom of this line, measured from the top of the unit (padding included).
  bottom: number
}

export type MeasuredUnit = {
  key: string
  height: number
  // A heading should not be the last thing on a page; it moves to the next page with
  // the block it introduces.
  keepWithNext?: boolean
  // Present for text that may be split across pages (scripture). Without it the unit
  // is never split.
  split?: { text: string; lines: LineInfo[] }
}

export type PagePlan =
  | { kind: 'pages'; pages: string[][] }
  // Split unit `key` at character `at` and measure the two parts, then plan again.
  | { kind: 'split'; key: string; at: number }

// Positions just after a sentence end (". ", "?” ", "!) "...), excluding the very end.
export function sentenceEnds(text: string): number[] {
  const ends: number[] = []
  const pattern = /[.!?;:]["”’')\]]*(?=\s)/g
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const at = match.index + match[0].length
    if (text.slice(at).trim() !== '') ends.push(at)
  }
  return ends
}

// Height needed to show text[0, at): the bottom of the line holding character at - 1.
function heightUpTo(lines: LineInfo[], at: number): number {
  const line = lines.find((candidate) => candidate.end >= at) ?? lines[lines.length - 1]
  return line ? line.bottom : Infinity
}

/**
 * Best place to split a unit so its first part fits in `available` height: the last
 * sentence end that fits, else the last whole line that fits (one very long sentence).
 * Returns null when not even the first line fits.
 */
export function chooseSplit(split: NonNullable<MeasuredUnit['split']>, available: number): number | null {
  const bySentence = sentenceEnds(split.text).filter((at) => heightUpTo(split.lines, at) <= available)
  if (bySentence.length > 0) return bySentence[bySentence.length - 1]

  const byLine = split.lines.filter((line) => line.bottom <= available && line.end < split.text.trim().length)
  return byLine.length > 0 ? byLine[byLine.length - 1].end : null
}

// Height of the smallest piece of a unit that could start a page: its first line, or
// all of it when it can't be split.
function firstPieceHeight(unit: MeasuredUnit): number {
  return unit.split?.lines[0]?.bottom ?? unit.height
}

/**
 * Greedy packing into pages of `pageHeight` (the space between header and footer).
 *
 * - A unit that does not fit starts a new page.
 * - A splittable unit taller than a whole page is split at a sentence end; the caller
 *   measures both parts and calls again. Shorter splittable units move to the next page
 *   whole, as the printed sheet does, rather than being cut.
 * - A keep-with-next unit (heading) that would end a page goes to the next page.
 * - A unit taller than a page that cannot be split gets a page of its own (it overflows;
 *   nothing better is possible).
 */
export function planPages(units: MeasuredUnit[], pageHeight: number): PagePlan {
  const pages: string[][] = [[]]
  let used = 0

  for (let index = 0; index < units.length; index++) {
    const unit = units[index]
    const page = pages[pages.length - 1]
    const remaining = pageHeight - used

    if (unit.height > pageHeight && unit.split) {
      // Too tall for any page: split so the first part fills what is left of this page.
      // If not even a sentence fits here, cut a first part sized for a whole page; the
      // next round then moves that part to a new page.
      const at = chooseSplit(unit.split, remaining) ?? chooseSplit(unit.split, pageHeight)
      if (at !== null) return { kind: 'split', key: unit.key, at }
    }

    let fits = unit.height <= remaining
    if (fits && unit.keepWithNext && index + 1 < units.length && page.length > 0) {
      fits = unit.height + firstPieceHeight(units[index + 1]) <= remaining
    }

    if (!fits && page.length > 0) {
      pages.push([unit.key])
      used = unit.height
    } else {
      page.push(unit.key)
      used += unit.height
    }
  }

  return { kind: 'pages', pages: pages.filter((page) => page.length > 0) }
}

import type { Segment } from '../../api/types'
import type { RenderItem } from '../reader/renderItems'

// The fill-in-the-blank game (PLAN §7, lighthouse-domain-rules). Pure functions, no
// React, so the rules are unit-tested.

export type Blank = { blankId: string; answer: string }

// A chip is the answer of one blank, identified by that blank's id. Which chip came
// from which blank never matters for scoring: only the answer text is compared, so two
// blanks with the same answer ("wanted", "wanted") accept either chip.
export type Chip = { chipId: string; answer: string }

// blankId → chipId placed in it.
export type Placements = Record<string, string>

function lineBlanks(line: Segment[]): Blank[] {
  return line.flatMap((segment) => ('blankId' in segment ? [{ blankId: segment.blankId, answer: segment.answer }] : []))
}

// Blanks in reading order on a page (or a whole note).
export function blanksOf(items: RenderItem[]): Blank[] {
  return items.flatMap((item) => {
    if (item.kind !== 'block') return []
    const { block } = item
    switch (block.type) {
      case 'HEADING':
      case 'PARAGRAPH':
        return lineBlanks(block.segments)
      case 'LIST':
        return block.items.flatMap(lineBlanks)
      default:
        return []
    }
  })
}

// Small, fast, deterministic PRNG: the tray order must not change between renders.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

// Shuffled with a fixed seed. Never left in reading order when there is more than one
// chip, or the tray would simply spell out the answers.
export function shuffle<T>(items: T[], seed: string): T[] {
  const random = mulberry32(hash(seed))
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  if (out.length > 1 && out.every((item, index) => item === items[index])) {
    out.push(out.shift()!)
  }
  return out
}

// The word bank of one page: only that page's answers, shuffled, minus chips already
// placed in a blank. Pages without blanks get an empty bank.
export function pageBank(pageBlanks: Blank[], placements: Placements, seed: string): Chip[] {
  const placed = new Set(Object.values(placements))
  const chips = pageBlanks.map((blank) => ({ chipId: blank.blankId, answer: blank.answer }))
  return shuffle(chips, seed).filter((chip) => !placed.has(chip.chipId))
}

// Puts a chip in a blank. A chip already in another blank moves; a chip already in this
// blank goes back to the tray.
export function place(placements: Placements, chipId: string, blankId: string): Placements {
  const next: Placements = {}
  for (const [blank, chip] of Object.entries(placements)) {
    if (chip !== chipId && blank !== blankId) next[blank] = chip
  }
  next[blankId] = chipId
  return next
}

export function removeFromBlank(placements: Placements, blankId: string): Placements {
  const next = { ...placements }
  delete next[blankId]
  return next
}

export function normalizeAnswer(answer: string) {
  return answer.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/[’‘]/g, "'").toLowerCase()
}

export type BlankResult = { blankId: string; answer: string; placed: string | null; correct: boolean }
export type Score = { correct: number; total: number; results: BlankResult[] }

// Whole-note score (the score is shown once, after the whole note). An empty blank is
// wrong.
export function scoreNote(blanks: Blank[], placements: Placements): Score {
  const answerOfChip = new Map(blanks.map((blank) => [blank.blankId, blank.answer]))
  const results = blanks.map((blank) => {
    const chipId = placements[blank.blankId]
    const placed = chipId ? answerOfChip.get(chipId) ?? null : null
    return {
      blankId: blank.blankId,
      answer: blank.answer,
      placed,
      correct: placed !== null && normalizeAnswer(placed) === normalizeAnswer(blank.answer),
    }
  })
  return { correct: results.filter((r) => r.correct).length, total: results.length, results }
}

// One width for every blank in a note, from its longest answer: wide enough for any
// chip, and identical for all blanks, so a blank's size gives nothing away.
export function blankWidth(blanks: Blank[], fontScale = 1): number {
  const longest = blanks.reduce((max, blank) => Math.max(max, blank.answer.length), 0)
  return Math.round(Math.min(170, Math.max(72, longest * 8.2 + 16)) * fontScale)
}

export type Attempt = {
  clientAttemptId: string
  noteId: string
  contentVersion: number
  score: number
  total: number
  completedAt: string
  // Phase 5 uploads unsynced attempts when the visitor is signed in.
  synced: boolean
}

// Best score per note, for the archive and home cards.
export function bestScores(attempts: Attempt[]): Record<string, { score: number; total: number }> {
  const best: Record<string, { score: number; total: number }> = {}
  for (const attempt of attempts) {
    const current = best[attempt.noteId]
    if (!current || attempt.score / attempt.total > current.score / current.total) {
      best[attempt.noteId] = { score: attempt.score, total: attempt.total }
    }
  }
  return best
}

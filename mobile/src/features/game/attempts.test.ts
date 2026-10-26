import { describe, expect, it } from '@jest/globals'
import { bestScores, type Attempt } from './game'

const attempt = (noteId: string, score: number, total: number): Attempt => ({
  clientAttemptId: `${noteId}-${score}`,
  noteId,
  contentVersion: 1,
  score,
  total,
  completedAt: '2026-10-27T10:00:00Z',
  synced: false,
})

describe('bestScores', () => {
  it('keeps the best attempt per note', () => {
    expect(bestScores([attempt('a', 3, 10), attempt('a', 8, 10), attempt('a', 5, 10), attempt('b', 2, 4)])).toEqual({
      a: { score: 8, total: 10 },
      b: { score: 2, total: 4 },
    })
  })

  it('compares by ratio when an edited note has a different number of blanks', () => {
    expect(bestScores([attempt('a', 8, 10), attempt('a', 9, 9)])).toEqual({ a: { score: 9, total: 9 } })
  })
})

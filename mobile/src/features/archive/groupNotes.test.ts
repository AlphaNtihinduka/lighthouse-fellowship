import { describe, expect, it } from '@jest/globals'
import type { PublicNoteSummary } from '../../api/types'
import { groupByYearAndMonth, paperDateLabel, sundayLabel } from './groupNotes'

const note = (sermonDate: string): PublicNoteSummary => ({
  id: sermonDate,
  title: `Note ${sermonDate}`,
  sermonDate,
  coverImageUrl: null,
  contentVersion: 1,
})

describe('groupByYearAndMonth', () => {
  it('groups newest first: year, then month, then Sunday', () => {
    const years = groupByYearAndMonth([note('2025-12-28'), note('2026-09-13'), note('2026-10-18'), note('2026-09-20')])

    expect(years.map((y) => y.year)).toEqual([2026, 2025])
    expect(years[0].months.map((m) => m.label)).toEqual(['October', 'September'])
    expect(years[0].months[1].notes.map((n) => n.sermonDate)).toEqual(['2026-09-20', '2026-09-13'])
    expect(years[1].months[0].label).toBe('December')
  })

  it('is empty when nothing is published', () => {
    expect(groupByYearAndMonth([])).toEqual([])
  })
})

describe('labels', () => {
  it('formats dates as the app and the sheet do', () => {
    expect(sundayLabel('2026-09-13')).toBe('Sunday 13 September')
    expect(paperDateLabel('2026-09-13')).toBe('September 13, 2026')
  })
})

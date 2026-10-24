import { describe, expect, it } from 'vitest'
import type { AdminNoteSummary } from '../../api/types'
import {
  buildSundayRows,
  currentYearMonth,
  formatChurchDateTime,
  parseYearMonth,
  shiftMonth,
  sundaysOfMonth,
} from './calendar'

const note = (sermonDate: string, status: AdminNoteSummary['status']): AdminNoteSummary => ({
  id: `id-${sermonDate}`,
  title: 'Killing Giants',
  preacherName: 'Pastor Joe Benecasa',
  sermonDate,
  coverImageUrl: null,
  contentVersion: 1,
  publishAt: status === 'DRAFT' ? null : '2026-09-13T07:00:00Z',
  status,
})

describe('sundaysOfMonth', () => {
  it('lists every Sunday of September 2026', () => {
    expect(sundaysOfMonth({ year: 2026, month: 9 })).toEqual(['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'])
  })

  it('handles a month that starts on a Sunday and has five of them', () => {
    expect(sundaysOfMonth({ year: 2026, month: 11 })).toEqual([
      '2026-11-01',
      '2026-11-08',
      '2026-11-15',
      '2026-11-22',
      '2026-11-29',
    ])
  })

  it('handles February in a leap year', () => {
    expect(sundaysOfMonth({ year: 2028, month: 2 })).toEqual(['2028-02-06', '2028-02-13', '2028-02-20', '2028-02-27'])
  })
})

describe('buildSundayRows', () => {
  it('marks Sundays without a note as empty and keeps the server status for the rest', () => {
    const rows = buildSundayRows({ year: 2026, month: 9 }, [
      note('2026-09-13', 'PUBLISHED'),
      note('2026-09-20', 'DRAFT'),
      note('2026-09-27', 'SCHEDULED'),
    ])
    expect(rows.map((row) => [row.date, row.state])).toEqual([
      ['2026-09-06', 'EMPTY'],
      ['2026-09-13', 'PUBLISHED'],
      ['2026-09-20', 'DRAFT'],
      ['2026-09-27', 'SCHEDULED'],
    ])
  })
})

describe('month navigation', () => {
  it('wraps across years', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })

  it('parses only valid YYYY-MM values', () => {
    expect(parseYearMonth('2026-09')).toEqual({ year: 2026, month: 9 })
    expect(parseYearMonth('2026-13')).toBeNull()
    expect(parseYearMonth('September')).toBeNull()
    expect(parseYearMonth(null)).toBeNull()
  })

  it('takes the current month in Rome time, not the computer clock', () => {
    // 23:30 UTC on 31 October is already 1 November in Rome (UTC+1 after the clocks change).
    expect(currentYearMonth(new Date('2026-10-31T23:30:00Z'))).toEqual({ year: 2026, month: 11 })
  })
})

describe('formatChurchDateTime', () => {
  it('shows a scheduled time in Rome time', () => {
    // 07:00 UTC in September = 09:00 in Rome (summer time).
    expect(formatChurchDateTime('2026-09-13T07:00:00Z')).toBe('Sun 13 Sept, 09:00')
  })
})

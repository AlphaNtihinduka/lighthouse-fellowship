import type { AdminNoteSummary } from '../../api/types'

// The church is in Naples; every date and time an admin sees is in Rome time,
// whatever time zone the admin's computer is set to.
export const CHURCH_TIME_ZONE = 'Europe/Rome'

export type YearMonth = { year: number; month: number } // month 1–12

export type SundayRow =
  | { date: string; state: 'EMPTY' }
  | { date: string; state: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED'; note: AdminNoteSummary }

const pad = (n: number) => String(n).padStart(2, '0')

export function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

// Calendar dates only (no time of day), so plain UTC arithmetic is exact.
export function sundaysOfMonth({ year, month }: YearMonth): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstSunday = 1 + ((7 - first.getUTCDay()) % 7)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const sundays: string[] = []
  for (let day = firstSunday; day <= daysInMonth; day += 7) {
    sundays.push(toIsoDate(year, month, day))
  }
  return sundays
}

// One row per Sunday. Every note is on a Sunday (the backend enforces it), so a note
// whose date isn't in the list can't happen; it is ignored rather than shown twice.
export function buildSundayRows(month: YearMonth, notes: AdminNoteSummary[]): SundayRow[] {
  const byDate = new Map(notes.map((note) => [note.sermonDate, note]))
  return sundaysOfMonth(month).map((date) => {
    const note = byDate.get(date)
    return note ? { date, state: note.status, note } : { date, state: 'EMPTY' }
  })
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function parseYearMonth(value: string | null): YearMonth | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { year, month } : null
}

export function formatYearMonth({ year, month }: YearMonth) {
  return `${year}-${pad(month)}`
}

export function currentYearMonth(now = new Date()): YearMonth {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHURCH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  }
}

export function monthLabel({ year, month }: YearMonth) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  )
}

// "Sunday 13 September"
export function sundayLabel(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}

// "Sun 13 Sep, 09:00" in Rome time.
export function formatChurchDateTime(instant: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CHURCH_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant))
}

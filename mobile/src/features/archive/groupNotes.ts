import type { PublicNoteSummary } from '../../api/types'

// Archive browsing (PLAN §2): year → month → Sunday, newest first.

export type MonthGroup = { month: number; label: string; notes: PublicNoteSummary[] }
export type YearGroup = { year: number; months: MonthGroup[] }

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function groupByYearAndMonth(notes: PublicNoteSummary[]): YearGroup[] {
  const sorted = [...notes].sort((a, b) => b.sermonDate.localeCompare(a.sermonDate))
  const years: YearGroup[] = []
  for (const note of sorted) {
    const year = Number(note.sermonDate.slice(0, 4))
    const month = Number(note.sermonDate.slice(5, 7))
    let yearGroup = years.at(-1)
    if (!yearGroup || yearGroup.year !== year) {
      yearGroup = { year, months: [] }
      years.push(yearGroup)
    }
    let monthGroup = yearGroup.months.at(-1)
    if (!monthGroup || monthGroup.month !== month) {
      monthGroup = { month, label: MONTHS[month - 1], notes: [] }
      yearGroup.months.push(monthGroup)
    }
    monthGroup.notes.push(note)
  }
  return years
}

// "Sunday 13 September"
export function sundayLabel(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10))
  return `Sunday ${day} ${MONTHS[Number(isoDate.slice(5, 7)) - 1]}`
}

// "September 13, 2026", as printed in the sheet's footer.
export function paperDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return year && month && day ? `${MONTHS[month - 1]} ${day}, ${year}` : ''
}

import type { SundayRow } from '../features/notes-calendar/calendar'
import { formatChurchDateTime } from '../features/notes-calendar/calendar'

const LABELS = {
  EMPTY: 'Empty',
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
} as const

export function StatusBadge({ row }: { row: SundayRow }) {
  const label =
    row.state === 'SCHEDULED' && row.note.publishAt
      ? `Scheduled · ${formatChurchDateTime(row.note.publishAt)}`
      : LABELS[row.state]
  return <span className={`badge badge--${row.state.toLowerCase()}`}>{label}</span>
}

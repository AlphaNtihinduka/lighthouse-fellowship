import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { listNotes, queryKeys } from '../api/endpoints'
import { StatusBadge } from '../components/StatusBadge'
import {
  buildSundayRows,
  currentYearMonth,
  formatYearMonth,
  monthLabel,
  parseYearMonth,
  shiftMonth,
  sundayLabel,
  type SundayRow,
  type YearMonth,
} from '../features/notes-calendar/calendar'

function rowLink(row: SundayRow) {
  return row.state === 'EMPTY' ? `/notes/new?date=${row.date}` : `/notes/${row.note.id}`
}

// Every Sunday of the selected month with its note's status (PLAN §8). The month is
// kept in the URL (?month=2026-09) so reloads and the back button keep it.
export function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const month: YearMonth = parseYearMonth(searchParams.get('month')) ?? currentYearMonth()

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.notes(month.year, month.month),
    queryFn: () => listNotes(month.year, month.month),
  })

  const goTo = (target: YearMonth) => setSearchParams({ month: formatYearMonth(target) })

  return (
    <>
      <div className="page-header">
        <h1>Sermon notes</h1>
        <div className="month-nav">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => goTo(shiftMonth(month, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="month-nav__label" aria-live="polite">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => goTo(shiftMonth(month, 1))}
            aria-label="Next month"
          >
            ›
          </button>
          <button type="button" className="button button--ghost" onClick={() => goTo(currentYearMonth())}>
            Today
          </button>
        </div>
      </div>

      {isPending && <p className="state-message muted">Loading…</p>}

      {isError && (
        <div className="alert alert--error" role="alert">
          {error.message}{' '}
          <button type="button" className="button button--secondary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <ul className="sunday-list">
          {buildSundayRows(month, data).map((row) => (
            <li key={row.date}>
              <Link className={`sunday${row.state === 'EMPTY' ? ' sunday--empty' : ''}`} to={rowLink(row)}>
                <span className="sunday__date">{sundayLabel(row.date)}</span>
                {row.state === 'EMPTY' ? (
                  <span className="muted">No note yet. Click to write one.</span>
                ) : (
                  <span>
                    <span className="sunday__title">{row.note.title}</span>
                    <br />
                    <span className="sunday__meta">{row.note.preacherName}</span>
                  </span>
                )}
                <StatusBadge row={row} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

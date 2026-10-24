import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router'
import { getNote, queryKeys } from '../api/endpoints'
import { currentYearMonth, formatYearMonth, sundaysOfMonth } from '../features/notes-calendar/calendar'
import { draftFromNote, isSunday, newDraft } from '../features/notes-editor/noteDraft'
import { NoteEditor } from '../features/notes-editor/NoteEditor'

// A new note gets the Sunday it was opened from (?date=), or the next Sunday of this month.
function defaultNewDate(requested: string | null) {
  if (requested && isSunday(requested)) return requested
  const today = new Date().toISOString().slice(0, 10)
  return sundaysOfMonth(currentYearMonth()).find((sunday) => sunday >= today) ?? sundaysOfMonth(currentYearMonth())[0]
}

export function NoteEditorPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.note(id ?? ''),
    queryFn: () => getNote(id ?? ''),
    enabled: Boolean(id),
  })

  const newDate = id ? null : defaultNewDate(searchParams.get('date'))
  const backMonth = (data?.sermonDate ?? newDate ?? formatYearMonth(currentYearMonth())).slice(0, 7)

  return (
    <>
      <div className="page-header">
        <Link to={`/notes?month=${backMonth}`}>‹ Back to sermon notes</Link>
        <h1>{id ? data?.title ?? 'Sermon note' : 'New sermon note'}</h1>
      </div>

      {id && isPending && <p className="state-message muted">Loading…</p>}
      {id && isError && (
        <div className="alert alert--error" role="alert">
          {error.message}
        </div>
      )}

      {/* key: switching notes (or new → saved) starts a fresh editor instead of mixing state. */}
      {id && data && <NoteEditor key={data.id} note={data} initialDraft={draftFromNote(data)} />}
      {!id && newDate && <NoteEditor key={`new-${newDate}`} note={null} initialDraft={newDraft(newDate)} />}
    </>
  )
}

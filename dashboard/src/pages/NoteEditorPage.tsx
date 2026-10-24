import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router'
import { getNote, queryKeys } from '../api/endpoints'
import { formatChurchDateTime, sundayLabel } from '../features/notes-calendar/calendar'

// Placeholder until the block editor lands (next phase 2 increment): shows which
// note was opened so the calendar's links can be checked end to end.
export function NoteEditorPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const newDate = searchParams.get('date')

  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.note(id ?? ''),
    queryFn: () => getNote(id ?? ''),
    enabled: Boolean(id),
  })

  return (
    <>
      <p>
        <Link to="/notes">‹ Back to sermon notes</Link>
      </p>
      {!id && <h1>New note{newDate ? ` for ${sundayLabel(newDate)}` : ''}</h1>}
      {id && isPending && <p className="muted">Loading…</p>}
      {id && isError && (
        <div className="alert alert--error" role="alert">
          {error.message}
        </div>
      )}
      {data && (
        <>
          <h1>{data.title}</h1>
          <p className="muted">
            {sundayLabel(data.sermonDate)} · {data.preacherName} · {data.blocks.length} blocks
            {data.publishAt && ` · ${data.status === 'SCHEDULED' ? 'appears' : 'published'} ${formatChurchDateTime(data.publishAt)}`}
          </p>
        </>
      )}
      <div className="card">
        <p>The note editor (blocks, blanks, preview and publishing) is coming in the next update.</p>
      </div>
    </>
  )
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { deleteNote, publishNote, queryKeys, unpublishNote } from '../../api/endpoints'
import type { AdminNote } from '../../api/types'
import { formatChurchDateTime } from '../notes-calendar/calendar'
import { isoToRomeLocal, romeLocalToIso } from './romeTime'

type Props = {
  note: AdminNote
  dirty: boolean
  onSaved: (note: AdminNote) => void
}

// Default schedule: the sermon's Sunday at 09:00 Rome time.
function defaultScheduleValue(note: AdminNote) {
  return note.publishAt ? isoToRomeLocal(note.publishAt) : `${note.sermonDate}T09:00`
}

export function PublishPanel({ note, dirty, onSaved }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [scheduleValue, setScheduleValue] = useState(() => defaultScheduleValue(note))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const afterChange = (updated: AdminNote) => {
    queryClient.setQueryData(queryKeys.note(updated.id), updated)
    queryClient.invalidateQueries({ queryKey: queryKeys.allNotes })
    onSaved(updated)
  }

  const publish = useMutation({
    mutationFn: (publishAt?: string) => publishNote(note.id, publishAt),
    onSuccess: afterChange,
  })
  const unpublish = useMutation({ mutationFn: () => unpublishNote(note.id), onSuccess: afterChange })
  const remove = useMutation({
    mutationFn: () => deleteNote(note.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.note(note.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.allNotes })
      navigate(`/notes?month=${note.sermonDate.slice(0, 7)}`, { replace: true })
    },
  })

  const scheduledIso = romeLocalToIso(scheduleValue)
  const busy = publish.isPending || unpublish.isPending || remove.isPending
  const error = publish.error ?? unpublish.error ?? remove.error

  return (
    <section className="card publish-panel" aria-label="Publishing">
      <h2>Publishing</h2>
      <p className="publish-panel__status">
        {note.status === 'DRAFT' && 'Draft: not visible in the app.'}
        {note.status === 'SCHEDULED' && note.publishAt && (
          <>Scheduled: appears in the app on <strong>{formatChurchDateTime(note.publishAt)}</strong> (Rome time).</>
        )}
        {note.status === 'PUBLISHED' && note.publishAt && (
          <>Published: visible in the app since {formatChurchDateTime(note.publishAt)}.</>
        )}
      </p>

      {error && (
        <div className="alert alert--error" role="alert">
          {error.message}
        </div>
      )}
      {dirty && <p className="field__hint">Save your changes before publishing.</p>}

      <div className="publish-panel__row">
        <button type="button" className="button" disabled={dirty || busy} onClick={() => publish.mutate(undefined)}>
          {note.status === 'PUBLISHED' ? 'Publish again now' : 'Publish now'}
        </button>
        {note.status !== 'DRAFT' && (
          <button type="button" className="button button--secondary" disabled={busy} onClick={() => unpublish.mutate()}>
            Unpublish
          </button>
        )}
      </div>

      <div className="field publish-panel__schedule">
        <label htmlFor="schedule">Or schedule (Rome time)</label>
        <div className="publish-panel__row">
          <input
            id="schedule"
            type="datetime-local"
            value={scheduleValue}
            onChange={(event) => setScheduleValue(event.target.value)}
          />
          <button
            type="button"
            className="button button--secondary"
            disabled={dirty || busy || !scheduledIso}
            onClick={() => scheduledIso && publish.mutate(scheduledIso)}
          >
            Schedule
          </button>
        </div>
      </div>

      <div className="publish-panel__danger">
        {confirmingDelete ? (
          <>
            <span>Delete this note for good?</span>
            <button type="button" className="button button--small" disabled={busy} onClick={() => remove.mutate()}>
              Delete note
            </button>
            <button type="button" className="button button--small button--ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="button button--small button--ghost" onClick={() => setConfirmingDelete(true)}>
            Delete note…
          </button>
        )}
      </div>
    </section>
  )
}

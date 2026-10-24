import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { createNote, queryKeys, updateNote } from '../../api/endpoints'
import type { AdminNote, BlockType, NoteBlock } from '../../api/types'
import { BlockEditor } from './BlockEditor'
import { CoverImageField } from './CoverImageField'
import {
  BLOCK_LABELS,
  blockIdInServerMessage,
  collectIds,
  DEFAULT_PREACHER,
  draftFromNote,
  draftToInput,
  emptyBlock,
  newId,
  validateDraft,
  type DraftProblem,
  type NoteDraft,
} from './noteDraft'
import { NotePreview } from './NotePreview'
import { PublishPanel } from './PublishPanel'

const BLOCK_TYPES: BlockType[] = ['HEADING', 'SCRIPTURE', 'PARAGRAPH', 'LIST', 'REFLECTION']

type Props = {
  // null for a new note
  note: AdminNote | null
  initialDraft: NoteDraft
}

const snapshot = (draft: NoteDraft) => JSON.stringify(draftToInput(draft))

export function NoteEditor({ note: initialNote, initialDraft }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [note, setNote] = useState(initialNote)
  const [draft, setDraft] = useState(initialDraft)
  const [savedSnapshot, setSavedSnapshot] = useState(() => (initialNote ? snapshot(initialDraft) : ''))
  const [problems, setProblems] = useState<DraftProblem[]>([])
  const [showProblems, setShowProblems] = useState(false)
  const dragIndex = useRef<number | null>(null)
  // Set just before the editor navigates itself (new note saved → its own URL), when
  // the "unsaved" state from the last render is already out of date.
  const allowNextNavigation = useRef(false)

  // Every id ever used in this editing session stays taken, so a removed blank's id
  // is never handed to a new blank.
  const usedIds = useRef(collectIds(initialDraft.blocks))
  const takeId = (prefix: 'b' | 'k') => {
    const id = newId(prefix, usedIds.current)
    usedIds.current.add(id)
    return id
  }

  const dirty = snapshot(draft) !== savedSnapshot
  const liveProblems = useMemo(() => validateDraft(draft), [draft])
  const visibleProblems = showProblems ? [...liveProblems, ...problems] : problems

  // Leaving with unsaved changes: in-app navigation asks first, and the browser warns on close/reload.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowNextNavigation.current) {
      allowNextNavigation.current = false
      return false
    }
    return dirty && currentLocation.pathname !== nextLocation.pathname
  })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const applySaved = (saved: AdminNote) => {
    const savedDraft = draftFromNote(saved)
    setNote(saved)
    setDraft(savedDraft)
    setSavedSnapshot(snapshot(savedDraft))
  }

  const save = useMutation({
    mutationFn: () => {
      const input = draftToInput(draft)
      return note ? updateNote(note.id, input) : createNote(input)
    },
    onSuccess: (saved) => {
      setProblems([])
      setShowProblems(false)
      queryClient.setQueryData(queryKeys.note(saved.id), saved)
      queryClient.invalidateQueries({ queryKey: queryKeys.allNotes })
      applySaved(saved)
      if (!note) {
        allowNextNavigation.current = true
        navigate(`/notes/${saved.id}`, { replace: true })
      }
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Saving failed. Try again.'
      const field = error instanceof ApiError && error.status === 409 ? 'sermonDate' : undefined
      setProblems([{ message, blockId: blockIdInServerMessage(message, draft.blocks), field }])
    },
  })

  function handleSave() {
    setShowProblems(true)
    if (liveProblems.length === 0) {
      setProblems([])
      save.mutate()
    }
  }

  const updateBlock = (index: number, block: NoteBlock) =>
    setDraft((current) => ({ ...current, blocks: current.blocks.map((b, i) => (i === index ? block : b)) }))

  const moveBlock = (from: number, to: number) =>
    setDraft((current) => {
      if (to < 0 || to >= current.blocks.length || from === to) return current
      const blocks = [...current.blocks]
      const [moved] = blocks.splice(from, 1)
      blocks.splice(to, 0, moved)
      return { ...current, blocks }
    })

  const addBlock = (type: BlockType) =>
    setDraft((current) => ({ ...current, blocks: [...current.blocks, emptyBlock(type, takeId('b'))] }))

  const fieldProblem = (field: DraftProblem['field']) =>
    visibleProblems.filter((problem) => problem.field === field).map((problem) => problem.message)

  const generalProblems = visibleProblems.filter((problem) => !problem.field && !problem.blockId)

  return (
    <div className="editor">
      {blocker.state === 'blocked' && (
        <div className="alert alert--error editor__leave" role="alertdialog" aria-label="Unsaved changes">
          You have unsaved changes.
          <button type="button" className="button button--small" onClick={() => blocker.proceed()}>
            Leave without saving
          </button>
          <button type="button" className="button button--small button--secondary" onClick={() => blocker.reset()}>
            Stay
          </button>
        </div>
      )}

      <div className="editor__main">
        <section className="card">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={draft.title}
              placeholder="Killing Giants"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            {fieldProblem('title').map((message) => (
              <span key={message} className="field__hint field__hint--error">{message}</span>
            ))}
          </div>
          <div className="editor__row">
            <div className="field">
              <label htmlFor="sermon-date">Sunday</label>
              <input
                id="sermon-date"
                type="date"
                step={7}
                value={draft.sermonDate}
                onChange={(event) => setDraft({ ...draft, sermonDate: event.target.value })}
              />
              {fieldProblem('sermonDate').map((message) => (
                <span key={message} className="field__hint field__hint--error">{message}</span>
              ))}
            </div>
            <div className="field">
              <label htmlFor="preacher">Preacher</label>
              <input
                id="preacher"
                value={draft.preacherName}
                placeholder={DEFAULT_PREACHER}
                onChange={(event) => setDraft({ ...draft, preacherName: event.target.value })}
              />
              {fieldProblem('preacherName').map((message) => (
                <span key={message} className="field__hint field__hint--error">{message}</span>
              ))}
            </div>
          </div>
          <CoverImageField note={note} onSaved={applySaved} />
        </section>

        <div className="block-list">
          {draft.blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              position={index}
              count={draft.blocks.length}
              problems={visibleProblems.filter((problem) => problem.blockId === block.id).map((problem) => problem.message)}
              onChange={(updated) => updateBlock(index, updated)}
              onMove={(delta) => moveBlock(index, index + delta)}
              onDelete={() => setDraft({ ...draft, blocks: draft.blocks.filter((_, i) => i !== index) })}
              newBlankId={() => takeId('k')}
              dragHandlers={{
                onDragStart: () => (dragIndex.current = index),
                onDragOver: (event) => event.preventDefault(),
                onDrop: () => {
                  if (dragIndex.current !== null) moveBlock(dragIndex.current, index)
                  dragIndex.current = null
                },
              }}
            />
          ))}
        </div>

        <div className="add-block" role="group" aria-label="Add a block">
          <span className="muted">Add:</span>
          {BLOCK_TYPES.map((type) => (
            <button key={type} type="button" className="button button--small button--secondary" onClick={() => addBlock(type)}>
              + {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="save-bar">
          {generalProblems.map((problem) => (
            <div key={problem.message} className="alert alert--error" role="alert">
              {problem.message}
            </div>
          ))}
          {showProblems && liveProblems.length > 0 && (
            <div className="alert alert--error" role="alert">
              Fix the {liveProblems.length === 1 ? 'problem' : `${liveProblems.length} problems`} marked above, then save again.
            </div>
          )}
          <button type="button" className="button" onClick={handleSave} disabled={save.isPending || (!dirty && note !== null)}>
            {save.isPending ? 'Saving…' : note ? 'Save changes' : 'Create note'}
          </button>
          <span className="muted">{dirty ? 'Unsaved changes' : note ? 'All changes saved' : ''}</span>
        </div>

        {note && <PublishPanel note={note} dirty={dirty} onSaved={applySaved} />}
      </div>

      <aside className="editor__preview">
        <NotePreview
          title={draft.title}
          preacherName={draft.preacherName || DEFAULT_PREACHER}
          sermonDate={draft.sermonDate}
          coverImageUrl={note?.coverImageUrl ?? null}
          blocks={draftToInput(draft).blocks}
        />
      </aside>
    </div>
  )
}

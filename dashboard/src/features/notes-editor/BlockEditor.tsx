import { useState, type DragEvent } from 'react'
import type { NoteBlock, Segment } from '../../api/types'
import { BLOCK_LABELS } from './noteDraft'
import { SegmentLineEditor } from './SegmentLineEditor'

type Props = {
  block: NoteBlock
  position: number
  count: number
  problems: string[]
  onChange: (block: NoteBlock) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
  newBlankId: () => string
  dragHandlers: {
    onDragStart: () => void
    onDragOver: (event: DragEvent) => void
    onDrop: () => void
  }
}

export function BlockEditor({ block, position, count, problems, onChange, onMove, onDelete, newBlankId, dragHandlers }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const label = `${BLOCK_LABELS[block.type]} ${position + 1}`

  return (
    <section
      className={`block-editor${problems.length ? ' block-editor--invalid' : ''}`}
      aria-label={label}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      <header className="block-editor__header">
        <span
          className="block-editor__handle"
          draggable
          onDragStart={dragHandlers.onDragStart}
          title="Drag to reorder"
          aria-hidden="true"
        >
          ⠿
        </span>
        <strong>{BLOCK_LABELS[block.type]}</strong>
        <span className="block-editor__actions">
          <button
            type="button"
            className="button button--small button--ghost"
            onClick={() => onMove(-1)}
            disabled={position === 0}
            aria-label={`Move ${label} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className="button button--small button--ghost"
            onClick={() => onMove(1)}
            disabled={position === count - 1}
            aria-label={`Move ${label} down`}
          >
            ↓
          </button>
          {confirmingDelete ? (
            <>
              <span className="block-editor__confirm">Delete this block?</span>
              <button type="button" className="button button--small" onClick={onDelete}>
                Delete
              </button>
              <button type="button" className="button button--small button--ghost" onClick={() => setConfirmingDelete(false)}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button--small button--ghost"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete ${label}`}
            >
              Delete
            </button>
          )}
        </span>
      </header>

      <BlockFields block={block} label={label} onChange={onChange} newBlankId={newBlankId} />

      {problems.map((problem) => (
        <p key={problem} className="block-editor__problem" role="alert">
          {problem}
        </p>
      ))}
    </section>
  )
}

function BlockFields({
  block,
  label,
  onChange,
  newBlankId,
}: {
  block: NoteBlock
  label: string
  onChange: (block: NoteBlock) => void
  newBlankId: () => string
}) {
  switch (block.type) {
    case 'HEADING':
      return (
        <>
          <SegmentLineEditor
            label={`${label} text`}
            placeholder="e.g. David and Jesus remained under God's authority."
            segments={block.segments}
            onChange={(segments) => onChange({ ...block, segments })}
            newBlankId={newBlankId}
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={block.numbered}
              onChange={(event) => onChange({ ...block, numbered: event.target.checked })}
            />
            Numbered (I, II, III…). Untick for a plain label like "Let's be clear!"
          </label>
        </>
      )
    case 'PARAGRAPH':
      return (
        <>
          <SegmentLineEditor
            label={`${label} text`}
            placeholder="Type the line, then select words to make a blank."
            segments={block.segments}
            onChange={(segments) => onChange({ ...block, segments })}
            newBlankId={newBlankId}
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={block.align === 'CENTER'}
              onChange={(event) => onChange({ ...block, align: event.target.checked ? 'CENTER' : 'LEFT' })}
            />
            Centred
          </label>
        </>
      )
    case 'LIST':
      return (
        <ol className="list-editor">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <SegmentLineEditor
                label={`${label} item ${itemIndex + 1}`}
                segments={item}
                onChange={(segments: Segment[]) =>
                  onChange({ ...block, items: block.items.map((other, i) => (i === itemIndex ? segments : other)) })
                }
                newBlankId={newBlankId}
              />
              {block.items.length > 1 && (
                <button
                  type="button"
                  className="button button--small button--ghost"
                  onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== itemIndex) })}
                >
                  Remove item
                </button>
              )}
            </li>
          ))}
          <li className="list-editor__add">
            <button
              type="button"
              className="button button--small button--secondary"
              onClick={() => onChange({ ...block, items: [...block.items, [{ text: '' }]] })}
            >
              + Add item
            </button>
          </li>
        </ol>
      )
    case 'SCRIPTURE':
      return (
        <>
          <div className="field">
            <label htmlFor={`${block.id}-text`}>Scripture text</label>
            <textarea
              id={`${block.id}-text`}
              className="scripture-input"
              rows={4}
              value={block.text}
              onChange={(event) => onChange({ ...block, text: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${block.id}-reference`}>Reference</label>
            <input
              id={`${block.id}-reference`}
              placeholder="1 Samuel 17:40-47"
              value={block.reference}
              onChange={(event) => onChange({ ...block, reference: event.target.value })}
            />
          </div>
        </>
      )
    case 'REFLECTION':
      return (
        <div className="field">
          <label htmlFor={`${block.id}-prompt`}>Question</label>
          <input
            id={`${block.id}-prompt`}
            placeholder="What is God showing me…?"
            value={block.prompt}
            onChange={(event) => onChange({ ...block, prompt: event.target.value })}
          />
          <span className="field__hint">Visitors type their own notes under this in the app.</span>
        </div>
      )
  }
}

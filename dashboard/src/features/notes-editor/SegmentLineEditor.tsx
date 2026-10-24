import { useState } from 'react'
import type { Segment } from '../../api/types'
import { checkBlankSelection, isText, makeBlank, removeBlank, setSegmentText } from './segments'

type Props = {
  label: string
  segments: Segment[]
  onChange: (segments: Segment[]) => void
  newBlankId: () => string
  placeholder?: string
}

type TextSelection = { index: number; start: number; end: number }

// One line (heading, paragraph or list item). Text is typed in place; selecting 1–3
// whole words and pressing "Make blank" turns them into a blank chip.
export function SegmentLineEditor({ label, segments, onChange, newBlankId, placeholder }: Props) {
  const [selection, setSelection] = useState<TextSelection | null>(null)

  const selected = selection ? segments[selection.index] : undefined
  const check =
    selection && selected && isText(selected) && selection.start !== selection.end
      ? checkBlankSelection(selected.text, selection.start, selection.end)
      : null

  function handleMakeBlank() {
    if (selection && check?.ok) {
      onChange(makeBlank(segments, selection.index, check, newBlankId()))
      setSelection(null)
    }
  }

  return (
    <div className="line-editor">
      <div className="line-editor__line" role="group" aria-label={`${label} line`}>
        {segments.map((segment, index) =>
          isText(segment) ? (
            <textarea
              key={index}
              className="line-editor__text"
              rows={1}
              cols={Math.min(60, Math.max(4, segment.text.length + 1))}
              value={segment.text}
              placeholder={segments.length === 1 ? placeholder : undefined}
              aria-label={segments.length === 1 ? label : `${label}, text ${index + 1}`}
              onChange={(event) => onChange(setSegmentText(segments, index, event.target.value.replace(/\n/g, ' ')))}
              onKeyDown={(event) => {
                // A line is one paragraph; a new line is a new block.
                if (event.key === 'Enter') event.preventDefault()
              }}
              onSelect={(event) => {
                const target = event.currentTarget
                setSelection({ index, start: target.selectionStart, end: target.selectionEnd })
              }}
            />
          ) : (
            <span key={segment.blankId} className="blank-chip">
              <span className="blank-chip__answer">{segment.answer}</span>
              <button
                type="button"
                className="blank-chip__remove"
                aria-label={`Turn blank "${segment.answer}" back into text`}
                title="Turn back into text"
                onClick={() => onChange(removeBlank(segments, index))}
              >
                ×
              </button>
            </span>
          ),
        )}
      </div>
      <div className="line-editor__tools">
        <button
          type="button"
          className="button button--small button--secondary"
          // Keep the text selection: clicking would otherwise blur the textarea first.
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleMakeBlank}
          disabled={!check?.ok}
          title={check && !check.ok ? check.reason : 'Select 1 to 3 words, then make them a blank'}
        >
          Make blank
        </button>
        {check && !check.ok && <span className="field__hint">{check.reason}</span>}
      </div>
    </div>
  )
}

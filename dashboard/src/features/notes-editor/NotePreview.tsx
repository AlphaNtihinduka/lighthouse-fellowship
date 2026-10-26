import { useState } from 'react'
import type { NoteBlock, Segment } from '../../api/types'
import { PaperFooter, PaperHeader } from './PaperFrame'
import { isBlank } from './segments'

type Props = {
  title: string
  preacherName: string
  sermonDate: string
  coverImageUrl: string | null
  blocks: NoteBlock[]
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/**
 * The note in the paper layout at phone width, matched to the photographed sheets in
 * docs/brand/sample-notes/ (header, numbered headings, bold italic scripture with a
 * right-aligned reference, double-rule footer).
 *
 * One continuous column for now, so it is a single page: no "(con't)" and no "(over)". Page breaks need the measure-and-pack function the
 * mobile reader will use; it is built once in phase 3 and this preview then uses it,
 * so the two can never disagree (dashboard-builder skill).
 */
export function NotePreview({ title, preacherName, sermonDate, coverImageUrl, blocks }: Props) {
  const [showAnswers, setShowAnswers] = useState(false)
  let headingNumber = 0

  return (
    <div className="preview">
      <div className="preview__toolbar">
        <strong>Preview</strong>
        <label className="checkbox">
          <input type="checkbox" checked={showAnswers} onChange={(event) => setShowAnswers(event.target.checked)} />
          Show answers
        </label>
      </div>
      <div className="phone" aria-label="Phone preview">
        <article className="paper">
          <PaperHeader title={title} coverImageUrl={coverImageUrl} />

          {blocks.length === 0 && <p className="paper__empty">Add blocks to see the note here.</p>}

          {blocks.map((block) => {
            switch (block.type) {
              case 'HEADING': {
                const number = block.numbered ? ROMAN[headingNumber++] ?? String(headingNumber) : null
                return (
                  <h3 key={block.id} className="paper__heading">
                    {number && <span className="paper__heading-number">{number}.</span>}
                    <span className="paper__heading-text">
                      <Line segments={block.segments} showAnswers={showAnswers} />
                    </span>
                  </h3>
                )
              }
              case 'SCRIPTURE':
                return (
                  <blockquote key={block.id} className="paper__scripture">
                    <p>“{block.text || '…'}”</p>
                    <footer>– {block.reference || 'Reference'}</footer>
                  </blockquote>
                )
              case 'PARAGRAPH':
                return (
                  <p key={block.id} className="paper__paragraph" style={{ textAlign: block.align === 'CENTER' ? 'center' : 'left' }}>
                    <Line segments={block.segments} showAnswers={showAnswers} />
                  </p>
                )
              case 'LIST':
                return (
                  <ol key={block.id} className="paper__list">
                    {block.items.map((item, index) => (
                      <li key={index}>
                        <Line segments={item} showAnswers={showAnswers} />
                      </li>
                    ))}
                  </ol>
                )
              case 'REFLECTION':
                return (
                  <div key={block.id} className="paper__reflection">
                    <p>{block.prompt || '…'}</p>
                    <div className="paper__notes-label">Notes:</div>
                    <div className="paper__notes-lines" />
                  </div>
                )
            }
          })}

          <PaperFooter preacherName={preacherName} sermonDate={sermonDate} />
        </article>
      </div>
    </div>
  )
}

// Blanks are drawn the same width whatever the answer, so the line gives no hint (PLAN §7).
function Line({ segments, showAnswers }: { segments: Segment[]; showAnswers: boolean }) {
  return (
    <>
      {segments.map((segment, index) =>
        isBlank(segment) ? (
          <span key={segment.blankId} className={`paper__blank${showAnswers ? ' paper__blank--answer' : ''}`}>
            {showAnswers ? segment.answer : ' '}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

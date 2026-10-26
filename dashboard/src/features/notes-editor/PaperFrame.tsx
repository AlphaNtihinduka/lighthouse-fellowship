// The repeating parts of a printed sermon-notes page, matched to the photos in
// docs/brand/sample-notes/. Every page has the header and footer; page breaks
// (phase 3) decide `continued` and `showOver` per page.

import { paperDateLabel } from '../notes-calendar/calendar'

type HeaderProps = {
  title: string
  coverImageUrl: string | null
  // Pages after the first: the title gets a small "(con't)".
  continued?: boolean
}

// Picture top left; "Sermon Notes" in maroon, centred; a maroon rule from the
// picture's right edge to the margin; the title centred under it.
export function PaperHeader({ title, coverImageUrl, continued = false }: HeaderProps) {
  return (
    <header className="paper__header">
      {coverImageUrl ? (
        <img className="paper__cover" src={coverImageUrl} alt="" />
      ) : (
        <div className="paper__cover paper__cover--empty" aria-hidden="true" />
      )}
      <div className="paper__kicker">Sermon Notes</div>
      <div className="paper__rule" aria-hidden="true" />
      <h2 className="paper__title">
        {title || 'Untitled'}
        {continued && <span className="paper__continued"> (con't)</span>}
      </h2>
    </header>
  )
}

type FooterProps = {
  preacherName: string
  sermonDate: string
  // Every page except the last: "(over)" bottom right, above the rule.
  showOver?: boolean
}

// "(over)" when more follows; a thick-over-thin double rule; preacher with the
// church under it on the left, the date on the right.
export function PaperFooter({ preacherName, sermonDate, showOver = false }: FooterProps) {
  return (
    <footer className="paper__footer">
      {showOver && <div className="paper__over">(over)</div>}
      <div className="paper__double-rule" aria-hidden="true" />
      <div className="paper__footer-text">
        <div>
          {preacherName}
          <br />
          Lighthouse Fellowship Napoli
        </div>
        <div>{paperDateLabel(sermonDate)}</div>
      </div>
    </footer>
  )
}

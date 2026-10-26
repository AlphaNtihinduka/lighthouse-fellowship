import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { paperDateLabel } from '../notes-calendar/calendar'
import { PaperFooter, PaperHeader } from './PaperFrame'

describe('paper frame (docs/brand/sample-notes/)', () => {
  it('prints the date the way the sheet does', () => {
    expect(paperDateLabel('2026-09-13')).toBe('September 13, 2026')
    expect(paperDateLabel('')).toBe('')
  })

  it('first page: title only; later pages: small (con\'t)', () => {
    const { rerender } = render(<PaperHeader title="Killing Giants" coverImageUrl={null} />)
    expect(screen.getByText('Sermon Notes')).toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent(/^Killing Giants$/)

    rerender(<PaperHeader title="Killing Giants" coverImageUrl={null} continued />)
    expect(screen.getByRole('heading')).toHaveTextContent("Killing Giants (con't)")
    expect(screen.getByText("(con't)")).toHaveClass('paper__continued')
  })

  it('footer: church under the preacher, date on the right, (over) only when more follows', () => {
    const { rerender, container } = render(<PaperFooter preacherName="Pastor Joe Benecasa" sermonDate="2026-09-13" />)
    const [left, right] = container.querySelectorAll('.paper__footer-text > div')
    expect(left).toHaveTextContent('Pastor Joe BenecasaLighthouse Fellowship Napoli')
    expect(left.querySelector('br')).not.toBeNull()
    expect(right).toHaveTextContent('September 13, 2026')
    expect(screen.queryByText('(over)')).toBeNull()

    rerender(<PaperFooter preacherName="Pastor Joe Benecasa" sermonDate="2026-09-13" showOver />)
    expect(screen.getByText('(over)')).toBeInTheDocument()
  })
})

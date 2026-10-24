import { describe, expect, it } from 'vitest'
import { isoToRomeLocal, romeLocalToIso } from './romeTime'

describe('romeLocalToIso', () => {
  it('converts Rome summer time (UTC+2)', () => {
    expect(romeLocalToIso('2026-09-13T09:00')).toBe('2026-09-13T07:00:00.000Z')
  })

  it('converts Rome winter time (UTC+1)', () => {
    expect(romeLocalToIso('2026-12-20T09:00')).toBe('2026-12-20T08:00:00.000Z')
  })

  it('is right on the day the clocks go back', () => {
    // 25 October 2026: Rome goes from UTC+2 to UTC+1 at 03:00.
    expect(romeLocalToIso('2026-10-25T09:00')).toBe('2026-10-25T08:00:00.000Z')
  })

  it('rejects anything that is not a datetime-local value', () => {
    expect(romeLocalToIso('')).toBeNull()
    expect(romeLocalToIso('13/09/2026 09:00')).toBeNull()
  })
})

describe('isoToRomeLocal', () => {
  it('round-trips through the picker value', () => {
    for (const value of ['2026-09-13T09:00', '2026-12-20T18:30', '2027-03-28T10:15']) {
      expect(isoToRomeLocal(romeLocalToIso(value)!)).toBe(value)
    }
  })
})

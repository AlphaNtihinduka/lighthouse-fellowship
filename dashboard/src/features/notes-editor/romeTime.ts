import { CHURCH_TIME_ZONE } from '../notes-calendar/calendar'

// The schedule picker is a plain <input type="datetime-local">, which has no time zone.
// Its value is read as Rome wall-clock time, whatever zone the admin's computer is in.

function romeWallClock(utcMillis: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHURCH_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMillis))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
}

// "2026-09-13T09:00" (Rome) → "2026-09-13T07:00:00.000Z".
export function romeLocalToIso(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  // Rome is UTC+1 or UTC+2. Start from that guess and correct by the observed
  // difference; the second pass settles the hours around a clock change.
  let utc = wanted - 60 * 60 * 1000
  for (let i = 0; i < 2; i++) {
    utc += wanted - romeWallClock(utc)
  }
  return new Date(utc).toISOString()
}

// "2026-09-13T07:00:00Z" → "2026-09-13T09:00" for the picker.
export function isoToRomeLocal(iso: string): string {
  return new Date(romeWallClock(Date.parse(iso))).toISOString().slice(0, 16)
}

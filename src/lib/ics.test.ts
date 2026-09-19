import { describe, expect, it } from 'vitest'

import {
  buildIcsCalendar,
  buildIcsFilename,
  escapeIcsText,
  formatIcsDateTime,
} from '@/lib/ics'
import type { CalendarEventData } from '@/types/calendar'

/** Written as escapes so this source file stays plain ASCII. */
const NUL = '\u0000'
const BELL = '\u0007'

const NOW = new Date('2026-09-10T08:30:00.000Z')

const event = (overrides: Partial<CalendarEventData> = {}): CalendarEventData => ({
  uid: 'gary__aina__active@sportsbuddy.app',
  title: 'Badminton with Aina',
  startAt: new Date('2026-09-12T09:00:00.000Z'),
  endAt: new Date('2026-09-12T11:00:00.000Z'),
  location: 'Subang Racquet Centre, Jalan SS15/4',
  description: 'Sports Buddy activity',
  ...overrides,
})

const linesOf = (ics: string) => ics.split('\r\n')

describe('formatIcsDateTime', () => {
  it('renders UTC in the compact calendar form', () => {
    expect(formatIcsDateTime(new Date('2026-09-12T09:00:00.000Z'))).toBe(
      '20260912T090000Z',
    )
  })

  it('converts a non-UTC instant rather than printing local wall time', () => {
    // 17:00 in Kuala Lumpur is 09:00Z. No offset is hardcoded anywhere.
    expect(formatIcsDateTime(new Date('2026-09-12T17:00:00+08:00'))).toBe(
      '20260912T090000Z',
    )
  })

  it('pads every component', () => {
    expect(formatIcsDateTime(new Date('2026-01-02T03:04:05.000Z'))).toBe(
      '20260102T030405Z',
    )
  })
})

describe('escapeIcsText', () => {
  it('escapes a backslash first, so later escapes are not double-escaped', () => {
    expect(escapeIcsText('a\\b')).toBe('a\\\\b')
  })

  it('escapes a comma', () => {
    expect(escapeIcsText('Court A, Level 2')).toBe('Court A\\, Level 2')
  })

  it('escapes a semicolon', () => {
    expect(escapeIcsText('Court A; Level 2')).toBe('Court A\\; Level 2')
  })

  it('escapes every newline form to one literal sequence', () => {
    expect(escapeIcsText('a\nb')).toBe('a\\nb')
    expect(escapeIcsText('a\rb')).toBe('a\\nb')
    expect(escapeIcsText('a\r\nb')).toBe('a\\nb')
  })

  it('strips control characters outright', () => {
    expect(escapeIcsText(`Court${NUL} A${BELL}`)).toBe('Court A')
  })

  it('returns an empty string for anything that is not a string', () => {
    expect(escapeIcsText(null)).toBe('')
    expect(escapeIcsText(undefined)).toBe('')
    expect(escapeIcsText(42)).toBe('')
  })

  it('leaves ordinary text alone', () => {
    expect(escapeIcsText("Let's play at 7:30")).toBe("Let's play at 7:30")
  })
})

describe('buildIcsCalendar', () => {
  it('emits the calendar and event envelopes', () => {
    const lines = linesOf(buildIcsCalendar(event(), NOW))
    expect(lines).toContain('BEGIN:VCALENDAR')
    expect(lines).toContain('VERSION:2.0')
    expect(lines).toContain('END:VCALENDAR')
    expect(lines).toContain('BEGIN:VEVENT')
    expect(lines).toContain('END:VEVENT')
  })

  it('uses CRLF line endings throughout', () => {
    const ics = buildIcsCalendar(event(), NOW)
    expect(ics).toContain('\r\n')
    // No bare LF anywhere: every one is preceded by a CR.
    expect(/[^\r]\n/.test(ics)).toBe(false)
    expect(ics.endsWith('\r\n')).toBe(true)
  })

  it('writes the event times and a DTSTAMP from the injected now', () => {
    const lines = linesOf(buildIcsCalendar(event(), NOW))
    expect(lines).toContain('DTSTART:20260912T090000Z')
    expect(lines).toContain('DTEND:20260912T110000Z')
    expect(lines).toContain('DTSTAMP:20260910T083000Z')
  })

  it('writes the title, location and description', () => {
    const lines = linesOf(buildIcsCalendar(event(), NOW))
    expect(lines).toContain('SUMMARY:Badminton with Aina')
    expect(lines).toContain('LOCATION:Subang Racquet Centre\\, Jalan SS15/4')
    expect(lines).toContain('DESCRIPTION:Sports Buddy activity')
  })

  it('omits URL entirely when there is none', () => {
    expect(buildIcsCalendar(event(), NOW)).not.toContain('URL:')
  })

  it('includes a URL when one was supplied', () => {
    const ics = buildIcsCalendar(
      event({ url: 'https://www.openstreetmap.org/?mlat=3.1&mlon=101.6#map=17/3.1/101.6' }),
      NOW,
    )
    expect(ics).toContain('URL:https://www.openstreetmap.org/?mlat=3.1&mlon=101.6#map=17/3.1/101.6')
  })

  it('never emits an HTML description alternative', () => {
    // One escaping context instead of two.
    expect(buildIcsCalendar(event(), NOW)).not.toContain('X-ALT-DESC')
  })

  /**
   * THE injection test. A venue name is untrusted text: it came from Google
   * Places, or from whichever participant proposed the venue.
   */
  it('cannot be made to inject a new ICS property', () => {
    const hostile = 'Court A\r\nATTENDEE:mailto:attacker@example.com'
    const ics = buildIcsCalendar(
      event({ location: hostile, title: hostile, description: hostile }),
      NOW,
    )

    // Not one line begins a property the app did not write.
    expect(linesOf(ics).some((line) => line.startsWith('ATTENDEE'))).toBe(false)
    // It survives as escaped text inside the value it was placed in.
    expect(ics).toContain('\\nATTENDEE:mailto:attacker@example.com')
  })

  it('cannot terminate the event or the calendar early', () => {
    const hostile = 'Court A\r\nEND:VEVENT\r\nEND:VCALENDAR\r\nBEGIN:VEVENT'
    const lines = linesOf(buildIcsCalendar(event({ location: hostile }), NOW))

    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(lines.filter((line) => line === 'END:VEVENT')).toHaveLength(1)
    expect(lines.filter((line) => line === 'END:VCALENDAR')).toHaveLength(1)
  })

  it('folds an over-long line rather than emitting it whole', () => {
    const ics = buildIcsCalendar(event({ title: 'A'.repeat(300) }), NOW)
    // Continuation lines start with a single space, per RFC 5545.
    expect(ics).toContain('\r\n ')
    for (const line of linesOf(ics)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})

describe('buildIcsFilename', () => {
  const startAt = new Date('2026-09-12T09:00:00.000Z')

  it('builds a readable, dated filename', () => {
    expect(buildIcsFilename('Badminton with Aina', startAt)).toBe(
      'sports-buddy-badminton-with-aina-2026-09-12.ics',
    )
  })

  it('cannot contain a path separator or a traversal', () => {
    const name = buildIcsFilename('../../etc/passwd', startAt)
    expect(name).not.toContain('/')
    expect(name).not.toContain('\\')
    expect(name).not.toContain('..')
    expect(name.endsWith('.ics')).toBe(true)
  })

  it('strips control characters and quotes', () => {
    expect(buildIcsFilename(`a b"c${NUL}\r\nd`, startAt)).toBe(
      'sports-buddy-a-b-c-d-2026-09-12.ics',
    )
  })

  it('still produces a valid name when the label slugs away to nothing', () => {
    expect(buildIcsFilename('///', startAt)).toBe('sports-buddy-2026-09-12.ics')
  })

  it('bounds the label length', () => {
    expect(buildIcsFilename('a'.repeat(500), startAt).length).toBeLessThan(80)
  })
})

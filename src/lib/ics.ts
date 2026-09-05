import type { CalendarEventData } from '@/types/calendar'

/**
 * ICS (RFC 5545) generation. Pure: no React, no Firebase, no clock except the
 * `now` a caller injects for DTSTAMP.
 *
 * ICS IS A SEPARATE ESCAPING CONTEXT. React escaping protects HTML rendering
 * and does nothing here: a venue name that is harmless on screen can still
 * end a property line and start a new one inside a calendar file. Every value
 * that reaches a property goes through `escapeIcsText` first, and property
 * NAMES are only ever written by this module.
 */

/** Control characters, which have no legitimate place in a calendar value. */
/* eslint-disable-next-line no-control-regex -- stripping control characters is the point */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Values are bounded before they are folded across lines. */
const MAX_VALUE_LENGTH = 512

/**
 * THE escaping function. RFC 5545 §3.3.11 requires backslash, semicolon,
 * comma and newline to be escaped inside a TEXT value.
 *
 * The order matters: backslash MUST be escaped first, or the backslashes this
 * function introduces would themselves be escaped again.
 *
 * CRLF INJECTION is the attack this exists for. A venue name of
 * `Court A\r\nATTENDEE:mailto:attacker@example.com` must stay one SUMMARY
 * value; every line break becomes a literal `\n` inside the value, so it can
 * never terminate the property and start a new one. Control characters are
 * removed outright, because no calendar client needs them and they are
 * another way to confuse a parser.
 */
export function escapeIcsText(raw: unknown): string {
  if (typeof raw !== 'string') return ''

  return raw
    .replace(CONTROL_CHARACTERS, '')
    .slice(0, MAX_VALUE_LENGTH)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    // Every line-ending form collapses to one escaped sequence, so `\r\n`
    // cannot survive as a real break.
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Date → `YYYYMMDDTHHMMSSZ` in UTC.
 *
 * UTC deliberately, so the file carries no VTIMEZONE component. An instant is
 * unambiguous, every calendar client renders it in the reader's own zone, and
 * the alternative — shipping timezone definitions — is a large amount of
 * standards surface for no user-visible gain. The UI still displays local
 * time; this format is never shown to anyone.
 */
export function formatIcsDateTime(date: Date): string {
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/**
 * RFC 5545 §3.1 line folding: no line over 75 octets, continuations start
 * with a single space. Measured in UTF-8 BYTES rather than characters,
 * because an emoji in a venue name is four octets and a character count would
 * silently produce an over-long line.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const folded: string[] = []
  let current = ''
  let bytes = 0

  for (const character of line) {
    const size = encoder.encode(character).length
    // 74 leaves room for the leading space a continuation line carries.
    if (bytes + size > 74) {
      folded.push(current)
      current = ''
      bytes = 0
    }
    current += character
    bytes += size
  }
  if (current) folded.push(current)

  return folded.join('\r\n ')
}

/**
 * One property line. The NAME is always a literal supplied by this module —
 * there is no code path where user input can become a property name, which is
 * the other half of injection safety.
 */
const property = (name: string, value: string) => foldLine(`${name}:${value}`)

/**
 * A calendar file containing one event.
 *
 * `now` is injected so DTSTAMP is testable; everything else comes from the
 * already-validated event.
 */
export function buildIcsCalendar(
  event: CalendarEventData,
  now: Date,
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sports Buddy//Activity Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    property('UID', escapeIcsText(event.uid)),
    property('DTSTAMP', formatIcsDateTime(now)),
    property('DTSTART', formatIcsDateTime(event.startAt)),
    property('DTEND', formatIcsDateTime(event.endAt)),
    property('SUMMARY', escapeIcsText(event.title)),
    property('LOCATION', escapeIcsText(event.location)),
    property('DESCRIPTION', escapeIcsText(event.description)),
    // No X-ALT-DESC / text-html alternative: a plain-text description is one
    // escaping context instead of two.
    ...(event.url ? [property('URL', escapeIcsText(event.url))] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // CRLF throughout, and a trailing break, as the standard requires.
  return `${lines.join('\r\n')}\r\n`
}

/**
 * A safe download filename, e.g. `sports-buddy-badminton-2026-09-12.ics`.
 *
 * The label is a sport name from our own dataset, but it is slugged anyway:
 * a filename is a THIRD context with its own rules, and this is the function
 * that guarantees a path separator, a `..`, a control character or a leading
 * dot can never reach `download`. The prefix and the extension are literals,
 * so the result is always a `.ics` file with a recognisable name even if the
 * label slugs away to nothing.
 */
export function buildIcsFilename(label: string, startAt: Date): string {
  const slug = label
    .toLowerCase()
    // Anything outside a–z, 0–9 becomes a separator. That covers `/`, `\`,
    // `..`, control characters, spaces and every Unicode script at once,
    // which an explicit blocklist would not.
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const date = Number.isNaN(startAt.getTime())
    ? ''
    : `-${formatIcsDateTime(startAt).slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}`

  return `sports-buddy${slug ? `-${slug}` : ''}${date}.ics`
}

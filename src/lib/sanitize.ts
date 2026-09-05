/**
 * TEXT NORMALIZATION BOUNDARY for anything a person types.
 *
 * Deliberately NOT a filter for "dangerous looking" content. React escapes
 * text when it renders it, so a bio containing `<script>alert(1)</script>` is
 * a harmless string, and a chat message containing `' OR 1=1 --` is a joke
 * rather than a query. Stripping `<`, `>` or `'` would break ordinary writing
 * ("Court A & B", "RM20-40", "<3") and would buy no safety at all.
 *
 * What this DOES remove is content with no legitimate typed form, which breaks
 * layout, logs and equality checks: C0/C1 control characters, zero-width and
 * bidirectional-override characters, and unbounded length.
 *
 * Every script stays welcome. Chinese, Bahasa Melayu, accents and emoji pass
 * through untouched - validation is about length, structure and control
 * characters, never about which language somebody writes in.
 */

/**
 * C0 controls except newline and tab, DEL, and the C1 block. None of these can
 * be typed; they are how a display name hides text in a log or a report view.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g

/**
 * Zero-width and bidirectional formatting characters. U+202E (right-to-left
 * override) is the classic "render the text backwards" trick, and the
 * zero-width ones let two different names display identically.
 */
const INVISIBLE_CHARACTERS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u00AD\uFEFF]/g

/** Windows/old-Mac line endings collapsed, so stored text compares reliably. */
const normalizeNewlines = (value: string) => value.replace(/\r\n?/g, '\n')

const strip = (value: string) =>
  normalizeNewlines(value)
    .replace(CONTROL_CHARACTERS, '')
    .replace(INVISIBLE_CHARACTERS, '')

/**
 * Single-line user text: display names, search queries, venue names.
 * Newlines and tabs become spaces, runs of whitespace collapse, and the result
 * is trimmed.
 *
 * `maxLength` TRUNCATES, so pass it only where there is nobody to tell — a
 * search filter, or a value read back from untrusted storage. For text a
 * person authored, leave it off and let validation report the length, or the
 * user's name is silently cut instead of explained.
 */
export const normalizeSingleLine = (raw: string, maxLength?: number): string => {
  const value = strip(raw).replace(/\s+/g, ' ').trim()
  return maxLength === undefined ? value : value.slice(0, maxLength)
}

/**
 * Multi-line user text: bios and chat messages. Paragraphs survive, but three
 * or more blank lines collapse to two, so nobody can push a conversation off
 * the screen with a wall of newlines.
 *
 * `maxLength` truncates — see `normalizeSingleLine` for when that is wrong.
 */
export const normalizeMultiLine = (raw: string, maxLength?: number): string => {
  const value = strip(raw)
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return maxLength === undefined ? value : value.slice(0, maxLength)
}

/**
 * True when the value carries characters no keyboard produces. The source
 * regexes are global, so they are rebuilt per call rather than sharing
 * `lastIndex` between callers.
 */
export const hasUnsafeCharacters = (raw: string): boolean =>
  new RegExp(CONTROL_CHARACTERS.source).test(raw) ||
  new RegExp(INVISIBLE_CHARACTERS.source).test(raw)

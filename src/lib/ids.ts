/**
 * DOCUMENT ID BOUNDARY.
 *
 * Route parameters reach `doc(db, COLLECTION, id)` directly. Collection names
 * are developer constants and never come from a user, so the remaining risk is
 * the id segment itself: a `/` turns one document path into a different,
 * deeper path, and `.` / `..` are reserved by Firestore.
 *
 * React Router will not put a `/` inside a single `:param`, but that is a
 * routing detail rather than a security boundary - a repository can also be
 * called programmatically. Validating here covers every caller.
 */

/** Firestore's own limit is 1500 bytes; nothing this app creates approaches it. */
const MAX_ID_LENGTH = 200

/** Control characters, which have no place in an id. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\u0000-\u001F\u007F]/

/**
 * Firestore id rules plus ours: no empty string, no path separator, not `.`
 * or `..`, no `__reserved__` form, no control characters, sane length.
 */
export function isValidDocumentId(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false
  if (raw.length === 0 || raw.length > MAX_ID_LENGTH) return false
  if (raw.includes('/')) return false
  if (raw === '.' || raw === '..') return false
  if (raw.startsWith('__') && raw.endsWith('__')) return false
  return raw.trim() === raw && !CONTROL.test(raw)
}

/** The id when valid, otherwise `null` - so a page can show "not available". */
export const validDocumentId = (raw: unknown): string | null =>
  isValidDocumentId(raw) ? raw : null

/**
 * A pair id (`connections/{id}`, `conversations/{id}`, and the plan derived
 * from one) is two user ids joined by `__`. Checking the shape stops a
 * malformed id reaching a rules lookup that would compare against nonsense.
 */
export function isValidPairId(raw: unknown): raw is string {
  if (!isValidDocumentId(raw)) return false
  const parts = raw.split('__')
  return (
    parts.length === 2 &&
    parts[0].length > 0 &&
    parts[1].length > 0 &&
    parts[0] !== parts[1]
  )
}

/**
 * URL SAFETY BOUNDARY.
 *
 * Every URL the app renders comes from somewhere untrusted: a Google Places
 * response, an auth provider, a Firestore document another member wrote, or
 * localStorage the user can edit by hand. `href` and `src` are the two places
 * where a string becomes behaviour, so both go through here.
 *
 * The rule is an ALLOWLIST of protocols, never a blocklist of payloads.
 * Blocking the literal string "javascript:" is defeated by casing, embedded
 * whitespace and control characters; `new URL()` resolving to a protocol that
 * is not on the list is not.
 */

/** Protocols that may be navigated to from a link. */
const LINK_PROTOCOLS: readonly string[] = ['https:', 'http:']

/** Protocols that may load into an `<img>`. Stricter: no data:, no http:. */
const IMAGE_PROTOCOLS: readonly string[] = ['https:']

/**
 * Whitespace and control characters. `new URL()` strips some of them before
 * parsing, which is exactly how `java\nscript:alert(1)` gets read as a
 * `javascript:` URL — so a string containing any of them is refused outright
 * rather than parsed.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNPARSEABLE = /[\u0000-\u0020\u007F-\u009F]/

function parse(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null
  if (raw.length === 0 || raw.length > 2048) return null
  if (UNPARSEABLE.test(raw)) return null

  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/** True when `raw` is an absolute http(s) URL that is safe to link to. */
export const isSafeLinkUrl = (raw: unknown): boolean => {
  const url = parse(raw)
  return url !== null && LINK_PROTOCOLS.includes(url.protocol)
}

/** True when `raw` is an absolute https URL that is safe to load as an image. */
export const isSafeImageUrl = (raw: unknown): boolean => {
  const url = parse(raw)
  return url !== null && IMAGE_PROTOCOLS.includes(url.protocol)
}

/**
 * The URL if it is safe to link to, otherwise `null` — so a caller renders
 * nothing rather than an inert or hostile link. It never returns a "cleaned"
 * version of a bad URL: a rejected URL stays rejected.
 */
export const safeLinkUrl = (raw: unknown): string | null =>
  isSafeLinkUrl(raw) ? (raw as string) : null

/** The image URL if safe, otherwise `null` so the caller falls back to initials. */
export const safeImageUrl = (raw: unknown): string | null =>
  isSafeImageUrl(raw) ? (raw as string) : null

/**
 * Hosts Google serves map links from. A venue's `googleMapsUri` is written by
 * whichever participant proposed the venue, so "it is https" is necessary but
 * not sufficient: an attacker-controlled https link is still a phishing target
 * once it is presented to the other person under an "Open in Maps" label.
 *
 * A URI that fails this is not rendered. The app falls back to a maps link it
 * builds itself from the validated place id and coordinates.
 */
const GOOGLE_MAPS_HOSTS: readonly string[] = [
  'google.com',
  'www.google.com',
  'maps.google.com',
  'goo.gl',
  'maps.app.goo.gl',
]

export const isTrustedMapsUrl = (raw: unknown): boolean => {
  const url = parse(raw)
  if (!url || url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return GOOGLE_MAPS_HOSTS.includes(host) || host.endsWith('.google.com')
}

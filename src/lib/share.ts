import { formatActivityDate, formatActivityTime } from '@/lib/activity-format'
import { isValidDocumentId } from '@/lib/ids'
import { getSportName } from '@/lib/profile-format'
import type { ActivityPost } from '@/types/activity-post'

/**
 * Share links for activity posts. Pure: no window, no clipboard, no storage —
 * the share service supplies the origin and does the browser work.
 *
 * A share link is `<origin>/activity/<postId>`. The post id is the whole
 * secret for a link-only post, which is why the rules refuse any query that
 * could list those posts (see `firestore.rules`, activityPosts).
 */

const SHARED_ACTIVITY_PATH = /^\/activity\/([^/]+)\/?$/

/**
 * A configured base URL → its origin, or `null` when it is not a real web
 * address. Only https is accepted, plus plain http for local development.
 */
export function toShareOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim())
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol === 'https:' || (url.protocol === 'http:' && isLocal)) {
      return url.origin
    }
    return null
  } catch {
    return null
  }
}

/** The words that travel with a link, in a chat or a share sheet. */
export const describeActivityForSharing = (
  post: Pick<ActivityPost, 'sportId' | 'startAt' | 'venueName'>,
) =>
  `${getSportName(post.sportId)} · ${formatActivityDate(post.startAt)}, ${formatActivityTime(post.startAt)} at ${post.venueName}. Want to join?`

export const buildActivityShareUrl = (origin: string, postId: string) =>
  `${origin}/activity/${encodeURIComponent(postId)}`

/**
 * The post id in a share link — but ONLY when the link points at one of our
 * own origins. A lookalike host gets `null`, so a message can never turn a
 * stranger's address into an in-app link.
 */
export function parseActivityShareUrl(
  raw: string,
  trustedOrigins: readonly string[],
): string | null {
  try {
    const url = new URL(raw)
    if (!trustedOrigins.includes(url.origin)) return null
    const match = SHARED_ACTIVITY_PATH.exec(url.pathname)
    if (!match) return null
    const postId = decodeURIComponent(match[1])
    return isValidDocumentId(postId) ? postId : null
  } catch {
    return null
  }
}

export type MessagePart =
  | { kind: 'text'; text: string }
  | { kind: 'activity'; text: string; postId: string }

const URL_TOKEN = /https?:\/\/[^\s]+/g

/**
 * Message text → plain text with our own activity links picked out, so the
 * bubble can render them as in-app links. Everything else, including every
 * other URL, stays plain text; nothing is ever turned into HTML.
 */
export function splitActivityLinks(
  content: string,
  trustedOrigins: readonly string[],
): MessagePart[] {
  const parts: MessagePart[] = []
  let last = 0
  for (const match of content.matchAll(URL_TOKEN)) {
    const postId = parseActivityShareUrl(match[0], trustedOrigins)
    if (!postId) continue
    const start = match.index
    if (start > last) parts.push({ kind: 'text', text: content.slice(last, start) })
    parts.push({ kind: 'activity', text: match[0], postId })
    last = start + match[0].length
  }
  if (last < content.length) parts.push({ kind: 'text', text: content.slice(last) })
  return parts
}

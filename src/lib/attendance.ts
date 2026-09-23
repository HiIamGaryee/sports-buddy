import {
  CHECK_IN_ASSUMED_DURATION_MINUTES,
  CHECK_IN_GRACE_MINUTES,
  CHECK_IN_PAYLOAD_PREFIX,
  MAX_CHECK_IN_CODE_LENGTH,
  MIN_CHECK_IN_CODE_LENGTH,
} from '@/constants/attendance'
import { isValidDocumentId } from '@/lib/ids'
import type { ActivityPost } from '@/types/activity-post'
import type { AttendanceRecord, CheckInPayload, CheckInSubject } from '@/types/attendance'
import type { GroupActivity } from '@/types/group-activity'

/**
 * Pure QR check-in and Reliability Profile rules. No storage, no React, no
 * camera — `now` is always injected, and encoding/decoding never touches
 * `document` or a canvas (that lives in the components that actually render
 * or scan a code).
 */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — never shown, but keeps it typeable if ever read aloud

/** A random check-in code. Not cryptographic-grade; regenerating invalidates a leaked one. */
export function generateCheckInCode(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => CODE_CHARS[byte % CODE_CHARS.length]).join('')
}

/**
 * One spelling of a code, so "abc 123" typed by an attendee matches "ABC123"
 * set by the host. Case and spaces are noise, not part of the secret.
 */
export const normalizeCheckInCode = (raw: string) =>
  raw.trim().toUpperCase().replace(/\s+/g, '')

/** Why a host-chosen code is unusable, or `null` when it is fine. */
export function getCheckInCodeError(raw: string): string | null {
  const code = normalizeCheckInCode(raw)
  if (code.length < MIN_CHECK_IN_CODE_LENGTH) {
    return `Use at least ${MIN_CHECK_IN_CODE_LENGTH} characters.`
  }
  if (code.length > MAX_CHECK_IN_CODE_LENGTH) {
    return `Use at most ${MAX_CHECK_IN_CODE_LENGTH} characters.`
  }
  // Letters and digits only: a code gets said out loud and typed on a phone
  // keyboard, and the payload itself is colon-separated.
  if (!/^[A-Z0-9]+$/.test(code)) return 'Use letters and numbers only.'
  return null
}

export const buildCheckInPayload = (activityId: string, code: string) =>
  `${CHECK_IN_PAYLOAD_PREFIX}:${activityId}:${code}`

/** The decoded QR text → `{activityId, code}`, or `null` for anything else (a stranger's QR, a URL, garbage). */
export function parseCheckInPayload(raw: string): CheckInPayload | null {
  const parts = raw.trim().split(':')
  if (parts.length !== 4 || `${parts[0]}:${parts[1]}` !== CHECK_IN_PAYLOAD_PREFIX) return null
  const [, , activityId, code] = parts
  if (!isValidDocumentId(activityId) || code.length === 0) return null
  return { activityId, code }
}

const MINUTE_MS = 60_000

/**
 * Both kinds of activity reduced to the only four things check-in cares about:
 * who hosts it, who is in it, and when it runs. A group activity and a 1-to-1
 * post then share ONE set of rules instead of two near-copies.
 */
export function toCheckInSubject(activity: GroupActivity): CheckInSubject {
  return {
    kind: 'group',
    id: activity.id,
    hostId: activity.organizerId,
    participantIds: activity.participantIds,
    startAt: activity.startAt,
    endAt: activity.endAt,
  }
}

/** A 1-to-1 post: its author hosts, and whoever took the spot is in it. */
export function toCheckInSubjectFromPost(post: ActivityPost): CheckInSubject {
  return {
    kind: 'post',
    id: post.id,
    hostId: post.authorId,
    participantIds: post.joinedIds,
    startAt: post.startAt,
    // A post has no end time, so the window falls back to the assumed length.
    endAt: null,
  }
}

/**
 * When check-in opens and closes: from the start time until
 * `CHECK_IN_GRACE_MINUTES` after the end. With no end time given, the
 * activity is assumed to run for `CHECK_IN_ASSUMED_DURATION_MINUTES`.
 *
 * The Firestore rules enforce the same window independently, so a client
 * cannot record a check-in outside it.
 */
export function getCheckInWindow(subject: CheckInSubject): {
  opensAt: number
  closesAt: number
} {
  const opensAt = new Date(subject.startAt).getTime()
  const endsAt = subject.endAt
    ? new Date(subject.endAt).getTime()
    : opensAt + CHECK_IN_ASSUMED_DURATION_MINUTES * MINUTE_MS
  return { opensAt, closesAt: endsAt + CHECK_IN_GRACE_MINUTES * MINUTE_MS }
}

/** Whether check-in is open right now, whoever is asking. */
export function isCheckInOpen(subject: CheckInSubject, now: Date): boolean {
  const { opensAt, closesAt } = getCheckInWindow(subject)
  return opensAt <= now.getTime() && now.getTime() <= closesAt
}

/**
 * Only a participant or the organizer, and only while check-in is open —
 * from the start time until shortly after the activity ends.
 */
export function canCheckIn(subject: CheckInSubject, viewerId: string, now: Date): boolean {
  const isInvolved = subject.hostId === viewerId || subject.participantIds.includes(viewerId)
  return isInvolved && isCheckInOpen(subject, now)
}

/**
 * Verified sessions and show-up rate, from ONLY what actually happened:
 * activities the member joined that have STARTED (an upcoming join is not
 * yet something to show up for), against the check-ins that exist for them.
 * `showUpRatePercent` is `null` with nothing started yet — 0/0 is not 0%.
 */
export function calculateReliability(
  startedJoinedActivityIds: readonly string[],
  attendanceRecords: readonly AttendanceRecord[],
  userId: string,
): {
  verifiedSessions: number
  showUpRatePercent: number | null
} {
  const attended = new Set(
    attendanceRecords.filter((record) => record.userId === userId).map((record) => record.activityId),
  )
  const verifiedSessions = startedJoinedActivityIds.filter((id) => attended.has(id)).length
  const eligible = startedJoinedActivityIds.length
  return {
    verifiedSessions,
    showUpRatePercent: eligible === 0 ? null : Math.round((verifiedSessions / eligible) * 100),
  }
}

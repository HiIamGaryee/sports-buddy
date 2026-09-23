import {
  CHECK_IN_ASSUMED_DURATION_MINUTES,
  CHECK_IN_GRACE_MINUTES,
  CHECK_IN_PAYLOAD_PREFIX,
} from '@/constants/attendance'
import { isValidDocumentId } from '@/lib/ids'
import type { AttendanceRecord, CheckInPayload } from '@/types/attendance'
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
 * When check-in opens and closes: from the start time until
 * `CHECK_IN_GRACE_MINUTES` after the end. With no end time given, the
 * activity is assumed to run for `CHECK_IN_ASSUMED_DURATION_MINUTES`.
 *
 * The Firestore rules enforce the same window independently, so a client
 * cannot record a check-in outside it.
 */
export function getCheckInWindow(activity: GroupActivity): {
  opensAt: number
  closesAt: number
} {
  const opensAt = new Date(activity.startAt).getTime()
  const endsAt = activity.endAt
    ? new Date(activity.endAt).getTime()
    : opensAt + CHECK_IN_ASSUMED_DURATION_MINUTES * MINUTE_MS
  return { opensAt, closesAt: endsAt + CHECK_IN_GRACE_MINUTES * MINUTE_MS }
}

/** Whether check-in is open right now, whoever is asking. */
export function isCheckInOpen(activity: GroupActivity, now: Date): boolean {
  const { opensAt, closesAt } = getCheckInWindow(activity)
  return opensAt <= now.getTime() && now.getTime() <= closesAt
}

/**
 * Only a participant or the organizer, and only while check-in is open —
 * from the start time until shortly after the activity ends.
 */
export function canCheckIn(activity: GroupActivity, viewerId: string, now: Date): boolean {
  const isInvolved = activity.organizerId === viewerId || activity.participantIds.includes(viewerId)
  return isInvolved && isCheckInOpen(activity, now)
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

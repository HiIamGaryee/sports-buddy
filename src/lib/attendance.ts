import { CHECK_IN_PAYLOAD_PREFIX } from '@/constants/attendance'
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

/** Only a participant or the organizer, and only once the activity has actually started. */
export function canCheckIn(activity: GroupActivity, viewerId: string, now: Date): boolean {
  const isInvolved = activity.organizerId === viewerId || activity.participantIds.includes(viewerId)
  return isInvolved && new Date(activity.startAt).getTime() <= now.getTime()
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

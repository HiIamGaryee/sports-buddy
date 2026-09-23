import type { AttendanceRecord, CheckInSubjectKind } from '@/types/attendance'

/**
 * `groupActivities/{activityId}/checkIn/current` (or
 * `activityPosts/{postId}/checkIn/current` for a 1-to-1) — the host's current
 * QR code, one document per activity, readable only by the organizer.
 * `attendanceRecords/{activityId}__{userId}` — one immutable record per
 * (activity, attendee) pair, created only by the attendee themselves and
 * only when their scanned code matches the current one.
 */
export interface AttendanceRepository {
  /**
   * The host's current code, creating one on first use. Host only.
   * `kind` picks the collection the code lives under — a group activity or a
   * 1-to-1 post; `attendanceRecords` itself is shared by both.
   */
  ensureCheckInCode(kind: CheckInSubjectKind, activityId: string, hostId: string): Promise<string>
  /** Invalidates a leaked/screenshotted code by replacing it. Host only. */
  regenerateCheckInCode(kind: CheckInSubjectKind, activityId: string, hostId: string): Promise<string>
  /** Verifies `code` against the current one and records the attendee. Idempotent. */
  checkIn(activityId: string, userId: string, code: string): Promise<AttendanceRecord>
  /** Everyone who has checked in to one activity. Organizer only. */
  listByActivity(activityId: string, limit: number): Promise<AttendanceRecord[]>
  /** Every activity this member has checked into, for their Reliability Profile. */
  listByUser(userId: string, limit: number): Promise<AttendanceRecord[]>
}

export const ATTENDANCE_COLLECTION = 'attendanceRecords'
export const CHECK_IN_SUBCOLLECTION = 'checkIn'
export const CHECK_IN_DOC_ID = 'current'

import { RELIABILITY_HISTORY_LIMIT } from '@/constants/attendance'
import { calculateReliability, canCheckIn, parseCheckInPayload } from '@/lib/attendance'
import { isUpcomingGroupActivity } from '@/lib/group-activity'
import { isValidDocumentId } from '@/lib/ids'
import { attendanceRepository, groupActivityRepository } from '@/repositories/repositories'
import { attendanceError, ATTENDANCE_ERROR_CODES, toAttendanceMessage } from '@/services/attendance/attendance-error'
import type { AttendanceRecord, ReliabilityStats } from '@/types/attendance'

const LOAD_FAILED = "We couldn't load check-in information."
const SHOW_CODE_FAILED = "We couldn't show a check-in code. Please try again."
const CHECK_IN_FAILED = "We couldn't check you in. Please try again."

/**
 * QR check-in and Reliability Profile. `now` is always injected, so nothing
 * here reads the clock itself.
 */
export const attendanceService = {
  /** Organizer only: the current code, creating one on first use. */
  async getCheckInCode(activityId: string, organizerId: string): Promise<string> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(organizerId)) {
      throw new Error(SHOW_CODE_FAILED)
    }
    try {
      return await attendanceRepository.ensureCheckInCode(activityId, organizerId)
    } catch {
      throw new Error(SHOW_CODE_FAILED)
    }
  },

  /** Organizer only: invalidates a leaked/screenshotted code. */
  async regenerateCheckInCode(activityId: string, organizerId: string): Promise<string> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(organizerId)) {
      throw new Error(SHOW_CODE_FAILED)
    }
    try {
      return await attendanceRepository.regenerateCheckInCode(activityId, organizerId)
    } catch {
      throw new Error(SHOW_CODE_FAILED)
    }
  },

  /**
   * The text decoded from a scanned QR → a recorded check-in. Validates the
   * payload shape, that it names THIS activity, and that the viewer is
   * actually involved and the activity has started — the same rule the
   * Firestore rules enforce again server-side.
   */
  async checkInFromScan(
    rawPayload: string,
    expectedActivityId: string,
    userId: string,
    now: Date,
  ): Promise<AttendanceRecord> {
    const payload = parseCheckInPayload(rawPayload)
    if (!payload || payload.activityId !== expectedActivityId) {
      throw new Error(toAttendanceMessage(attendanceError(ATTENDANCE_ERROR_CODES.wrongCode), CHECK_IN_FAILED))
    }
    if (!isValidDocumentId(userId)) throw new Error(CHECK_IN_FAILED)

    const activity = await groupActivityRepository.getById(expectedActivityId).catch(() => null)
    if (!activity) {
      throw new Error(toAttendanceMessage(attendanceError(ATTENDANCE_ERROR_CODES.missing), CHECK_IN_FAILED))
    }
    if (!canCheckIn(activity, userId, now)) {
      const code = isUpcomingGroupActivity(activity, now)
        ? ATTENDANCE_ERROR_CODES.notInvolved
        : ATTENDANCE_ERROR_CODES.notStarted
      throw new Error(toAttendanceMessage(attendanceError(code), CHECK_IN_FAILED))
    }

    try {
      return await attendanceRepository.checkIn(expectedActivityId, userId, payload.code)
    } catch (error) {
      throw new Error(toAttendanceMessage(error, CHECK_IN_FAILED))
    }
  },

  /** Organizer only: who has checked in to one activity. */
  async listByActivity(activityId: string): Promise<AttendanceRecord[]> {
    if (!isValidDocumentId(activityId)) throw new Error(LOAD_FAILED)
    try {
      return await attendanceRepository.listByActivity(activityId, RELIABILITY_HISTORY_LIMIT)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  /**
   * A member's own Reliability Profile: verified sessions and show-up rate,
   * from their own started joined-plus-hosted activities and their own
   * check-ins only.
   */
  async getReliability(userId: string, now: Date): Promise<ReliabilityStats> {
    if (!isValidDocumentId(userId)) throw new Error(LOAD_FAILED)
    try {
      const [hosted, joined, records] = await Promise.all([
        groupActivityRepository.listByOrganizer(userId, RELIABILITY_HISTORY_LIMIT),
        groupActivityRepository.listJoinedBy(userId, RELIABILITY_HISTORY_LIMIT),
        attendanceRepository.listByUser(userId, RELIABILITY_HISTORY_LIMIT),
      ])
      const startedIds = [...hosted, ...joined]
        .filter((activity) => !isUpcomingGroupActivity(activity, now))
        .map((activity) => activity.id)
      return calculateReliability(startedIds, records, userId)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },
}

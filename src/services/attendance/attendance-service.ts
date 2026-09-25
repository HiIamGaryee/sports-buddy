import { RELIABILITY_HISTORY_LIMIT } from '@/constants/attendance'
import {
  calculateReliability,
  canCheckIn,
  getCheckInCodeError,
  getCheckInWindow,
  normalizeCheckInCode,
  parseCheckInPayload,
  toCheckInSubject,
  toCheckInSubjectFromPost,
} from '@/lib/attendance'
import { isUpcomingPost } from '@/lib/activity-post'
import { isUpcomingGroupActivity } from '@/lib/group-activity'
import { isValidDocumentId } from '@/lib/ids'
import {
  activityPostRepository,
  attendanceRepository,
  groupActivityRepository,
} from '@/repositories/repositories'
import { attendanceError, ATTENDANCE_ERROR_CODES, toAttendanceMessage } from '@/services/attendance/attendance-error'
import type {
  AttendanceRecord,
  CheckInSubject,
  CheckInSubjectKind,
  ReliabilityStats,
} from '@/types/attendance'

const LOAD_FAILED = "We couldn't load check-in information."
const SHOW_CODE_FAILED = "We couldn't show a check-in code. Please try again."
const CHECK_IN_FAILED = "We couldn't check you in. Please try again."

/** The live activity being checked into, whichever collection it lives in. */
async function loadSubject(
  kind: CheckInSubjectKind,
  activityId: string,
): Promise<CheckInSubject | null> {
  if (kind === 'group') {
    const activity = await groupActivityRepository.getById(activityId).catch(() => null)
    return activity ? toCheckInSubject(activity) : null
  }
  const post = await activityPostRepository.getById(activityId).catch(() => null)
  return post ? toCheckInSubjectFromPost(post) : null
}

/**
 * QR check-in and Reliability Profile. `now` is always injected, so nothing
 * here reads the clock itself.
 */
export const attendanceService = {
  /** Host only: the current code, creating one on first use. */
  async getCheckInCode(
    kind: CheckInSubjectKind,
    activityId: string,
    hostId: string,
  ): Promise<string> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(hostId)) {
      throw new Error(SHOW_CODE_FAILED)
    }
    try {
      return await attendanceRepository.ensureCheckInCode(kind, activityId, hostId)
    } catch {
      throw new Error(SHOW_CODE_FAILED)
    }
  },

  /** Host only: invalidates a leaked/screenshotted code. */
  async regenerateCheckInCode(
    kind: CheckInSubjectKind,
    activityId: string,
    hostId: string,
  ): Promise<string> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(hostId)) {
      throw new Error(SHOW_CODE_FAILED)
    }
    try {
      return await attendanceRepository.regenerateCheckInCode(kind, activityId, hostId)
    } catch {
      throw new Error(SHOW_CODE_FAILED)
    }
  },

  /**
   * The host chooses their own code — something they can read out at the
   * venue. Validated here as well as in the form, because a programmatic
   * caller skips the UI, and the rules check its size again server-side.
   */
  async setCheckInCode(
    kind: CheckInSubjectKind,
    activityId: string,
    hostId: string,
    rawCode: string,
  ): Promise<string> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(hostId)) {
      throw new Error(SHOW_CODE_FAILED)
    }
    const problem = getCheckInCodeError(rawCode)
    if (problem) throw new Error(problem)
    try {
      return await attendanceRepository.setCheckInCode(
        kind,
        activityId,
        hostId,
        normalizeCheckInCode(rawCode),
      )
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
    kind: CheckInSubjectKind,
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

    const subject = await loadSubject(kind, expectedActivityId)
    if (!subject) {
      throw new Error(toAttendanceMessage(attendanceError(ATTENDANCE_ERROR_CODES.missing), CHECK_IN_FAILED))
    }
    if (!canCheckIn(subject, userId, now)) {
      // Not yet open, or the window closed, or they are simply not in it.
      const code =
        now.getTime() < getCheckInWindow(subject).opensAt
          ? ATTENDANCE_ERROR_CODES.notStarted
          : ATTENDANCE_ERROR_CODES.notInvolved
      throw new Error(toAttendanceMessage(attendanceError(code), CHECK_IN_FAILED))
    }

    try {
      return await attendanceRepository.checkIn(expectedActivityId, userId, payload.code)
    } catch (error) {
      throw new Error(toAttendanceMessage(error, CHECK_IN_FAILED))
    }
  },

  /** The signed-in member's own check-ins, for "you already checked in". */
  async listMine(userId: string): Promise<AttendanceRecord[]> {
    if (!isValidDocumentId(userId)) throw new Error(LOAD_FAILED)
    try {
      return await attendanceRepository.listByUser(userId, RELIABILITY_HISTORY_LIMIT)
    } catch {
      throw new Error(LOAD_FAILED)
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
      const [hosted, joined, postsAuthored, postsJoined, records] = await Promise.all([
        groupActivityRepository.listByOrganizer(userId, RELIABILITY_HISTORY_LIMIT),
        groupActivityRepository.listJoinedBy(userId, RELIABILITY_HISTORY_LIMIT),
        activityPostRepository.listByAuthor(userId, RELIABILITY_HISTORY_LIMIT),
        activityPostRepository.listJoinedBy(userId, RELIABILITY_HISTORY_LIMIT),
        attendanceRepository.listByUser(userId, RELIABILITY_HISTORY_LIMIT),
      ])
      const startedGroupIds = [...hosted, ...joined]
        .filter((activity) => !isUpcomingGroupActivity(activity, now))
        .map((activity) => activity.id)
      // A 1-to-1 only counts once somebody actually took the spot: a post
      // nobody joined was never a session to show up for.
      const startedPostIds = [...postsAuthored, ...postsJoined]
        .filter((post) => post.joinedIds.length > 0 && !isUpcomingPost(post, now))
        .map((post) => post.id)
      return calculateReliability([...startedGroupIds, ...startedPostIds], records, userId)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },
}

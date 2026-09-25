/**
 * QR check-in and verified attendance for public group activities.
 *
 * PAST IS NOT COMPLETED (`CLAUDE.md` STEP 13) still holds for `Activity` and
 * `GroupActivity`: an activity's own document never says whether anyone
 * showed up. An `AttendanceRecord` is a SEPARATE, additive fact — "this
 * person's device scanned this activity's code" — not a status on the
 * activity, and its absence is never read as "did not attend": a member who
 * never opens the check-in flow (no phone signal, forgot) simply has no
 * record, not a negative one.
 */
export interface AttendanceRecord {
  id: string
  activityId: string
  userId: string
  checkedInAt: string | null
}

/** What the QR encodes — never a real URL, so a generic scanner shows plain text. */
export interface CheckInPayload {
  activityId: string
  code: string
}

/** Verified, evidence-based numbers — never an absolute claim like "never flakes". */
export interface ReliabilityStats {
  verifiedSessions: number
  /**
   * Sessions that COULD have been checked into: started activities the member
   * hosted or joined. The denominator behind the rate, so the card can say
   * "8 of 8" rather than only a percentage.
   */
  eligibleSessions: number
  /** `null` when there is nothing to divide by yet (no started joined activities). */
  showUpRatePercent: number | null
}

/** Which collection an activity being checked into lives in. */
export type CheckInSubjectKind = 'group' | 'post'

/**
 * The minimum an activity must say for check-in to reason about it, so a
 * public group activity and a 1-to-1 post share one set of rules. Built by
 * `toCheckInSubject` / `toCheckInSubjectFromPost` in `src/lib/attendance.ts`.
 */
export interface CheckInSubject {
  kind: CheckInSubjectKind
  id: string
  /** The organizer of a group activity, or the author of a 1-to-1 post. */
  hostId: string
  /** Everyone else who is in — participants, or whoever took the 1-to-1 spot. */
  participantIds: readonly string[]
  startAt: string
  /** A group activity may declare an end; a 1-to-1 post never does. */
  endAt: string | null
}

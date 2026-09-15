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
  /** `null` when there is nothing to divide by yet (no started joined activities). */
  showUpRatePercent: number | null
}

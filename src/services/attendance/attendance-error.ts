/** Why a check-in was refused, so the service can say it plainly. */
export const ATTENDANCE_ERROR_CODES = {
  missing: 'attendance/missing',
  notInvolved: 'attendance/not-involved',
  notStarted: 'attendance/not-started',
  wrongCode: 'attendance/wrong-code',
  notOrganizer: 'attendance/not-organizer',
} as const

type AttendanceErrorCode = (typeof ATTENDANCE_ERROR_CODES)[keyof typeof ATTENDANCE_ERROR_CODES]

export class AttendanceError extends Error {
  readonly code: AttendanceErrorCode

  constructor(code: AttendanceErrorCode) {
    super(code)
    this.code = code
    this.name = 'AttendanceError'
  }
}

export const attendanceError = (code: AttendanceErrorCode) => new AttendanceError(code)

const MESSAGES: Record<AttendanceErrorCode, string> = {
  [ATTENDANCE_ERROR_CODES.missing]: 'This activity is no longer available.',
  [ATTENDANCE_ERROR_CODES.notInvolved]:
    'Only people joined to this activity can check in.',
  [ATTENDANCE_ERROR_CODES.notStarted]: "You can check in once the activity has started.",
  [ATTENDANCE_ERROR_CODES.wrongCode]:
    "That code doesn't match this activity. Ask the organizer to show it again.",
  [ATTENDANCE_ERROR_CODES.notOrganizer]:
    'Only the organizer can do that.',
}

export const toAttendanceMessage = (error: unknown, fallback: string) =>
  error instanceof AttendanceError ? MESSAGES[error.code] : fallback

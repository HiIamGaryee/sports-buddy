import type {
  CalendarFailureReason,
  CalendarOperationResult,
} from '@/types/calendar'

/**
 * The only calendar messages a user ever sees. A provider never supplies its
 * own wording, so a native bridge error, a plugin stack trace or the contents
 * of a generated file can never reach the screen.
 */
export const CALENDAR_MESSAGES: Record<CalendarFailureReason, string> = {
  'invalid-activity': "This activity's details are incomplete.",
  'permission-denied':
    "Calendar access wasn't allowed. You can still download a calendar file.",
  failed: "We couldn't create the calendar event. Please try again.",
}

export const calendarFailure = (
  reason: CalendarFailureReason,
): CalendarOperationResult => ({
  ok: false,
  reason,
  message: CALENDAR_MESSAGES[reason],
})

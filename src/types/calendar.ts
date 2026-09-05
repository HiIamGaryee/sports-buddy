/**
 * The provider-independent shape of a calendar entry.
 *
 * Deliberately NOT an `Activity`. A provider — an ICS file today, a native
 * bridge later — has no business seeing participant ids, a connection id or a
 * source plan id, and a smaller model is what makes it obvious that none of
 * those can leak into an exported file.
 *
 * Everything here is already validated and already safe to serialize.
 */
export interface CalendarEventData {
  /**
   * Stable across exports of the same activity, so a calendar client has the
   * chance to recognise a re-import as the same event.
   */
  uid: string
  /** "Badminton with Aina" — a sport label and a display name, never ids. */
  title: string
  startAt: Date
  endAt: Date
  /** The agreed venue: name and address. Never anybody's area or home. */
  location: string
  /** Plain text. No HTML, no chat content, no private profile fields. */
  description: string
  /** Optional, and only ever a validated https link. */
  url?: string
}

/** How the event actually reached the user, so the UI can be honest about it. */
export type CalendarDeliveryMethod =
  /** A file was produced for the user to import themselves. */
  | 'file'
  /** The event was written straight into the device calendar. */
  | 'native'

export type CalendarOperationResult =
  | { ok: true; method: CalendarDeliveryMethod }
  | { ok: false; reason: CalendarFailureReason; message: string }

/**
 * Why an export did not happen. The UI maps these to copy; a provider never
 * supplies its own user-facing message, and never a stack trace.
 */
export type CalendarFailureReason =
  /** The activity could not produce a valid event (bad time, venue, sport). */
  | 'invalid-activity'
  /** A native provider asked for calendar access and was refused. */
  | 'permission-denied'
  /** Anything else: the file could not be produced, the bridge failed. */
  | 'failed'

/**
 * One way of getting an event in front of the user. Implementations receive
 * an already-validated `CalendarEventData` and never a raw activity.
 */
export interface CalendarProvider {
  /** Identifies the implementation in results and in tests. */
  readonly method: CalendarDeliveryMethod
  addEvent(event: CalendarEventData): Promise<CalendarOperationResult>
}

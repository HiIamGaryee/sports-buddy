import { isActivityPast } from '@/lib/activity'
import { env } from '@/config/env'
import { formatDuration } from '@/lib/activity-format'
import { isValidDocumentId } from '@/lib/ids'
import { formatBudget, getSportName } from '@/lib/profile-format'
import { normalizeSingleLine } from '@/lib/sanitize'
import { isSportId } from '@/services/profile/profile-schema'
import { calendarFailure } from '@/services/calendar/calendar-error'
import { createIcsCalendarProvider } from '@/services/calendar/providers/ics-calendar-provider'
import { isTrustedMapsUrl, isTrustedOpenStreetMapUrl } from '@/lib/safe-url'
import type { Activity } from '@/types/activity'
import type {
  CalendarEventData,
  CalendarOperationResult,
  CalendarProvider,
} from '@/types/calendar'

/**
 * Turning a confirmed activity into a calendar entry.
 *
 * THE ACTIVITY IS THE SOURCE OF TRUTH. Nothing here reads the source
 * `ActivityPlan`: the sport, the time, the budget and the venue were all
 * snapshotted at confirmation, so an export needs no second read and works
 * offline.
 *
 * The service validates and maps; a provider delivers. Providers only ever
 * see `CalendarEventData`, never an `Activity`, so participant ids, the
 * connection id and the source plan id cannot reach an exported file.
 */

/** Bounds a value that came from OpenStreetMap or another member's profile. */
const MAX_FIELD_LENGTH = 200

/**
 * Chosen once, here. The UI never branches on the platform — it calls
 * `addActivity` and reads `result.method` to decide what to say.
 *
 * No native provider exists: the project has `@capacitor/core` only, and no
 * maintained calendar plugin is installed. Installing an unmaintained one to
 * satisfy a checkbox would be worse than the ICS flow, which already works on
 * every platform including inside a WebView. When a supported provider is
 * chosen this is the one function that changes.
 */
function selectProvider(): CalendarProvider {
  return createIcsCalendarProvider()
}

/**
 * A stable, opaque digest of the activity id.
 *
 * The id itself must NOT go into the file: it is `{userA}__{userB}__active`,
 * so a raw UID would carry both participants' account ids into a document the
 * user can forward to anybody. A digest keeps the one property a UID needs —
 * the same activity always produces the same value — while carrying no
 * identifiers.
 *
 * FNV-1a over four offsets gives 128 bits without a dependency and without an
 * async crypto call. This is a stability device, not a security primitive:
 * nothing anywhere trusts a UID.
 */
function digest(value: string): string {
  const OFFSETS = [0x811c9dc5, 0x01000193, 0x7fffffff, 0x9e3779b9]

  return OFFSETS.map((offset) => {
    let hash = offset
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      // The FNV prime, applied with shifts so it stays in 32-bit range.
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash.toString(16).padStart(8, '0')
  }).join('')
}

/**
 * The stable event identifier. Exporting the same activity twice produces the
 * same UID, so a calendar client has the chance to recognise a re-import as
 * the same event.
 *
 * Never random — that would make every export a new event. Never the title
 * either: a title is user-influenced, so the identity would change when
 * somebody renames themselves.
 */
export const buildCalendarUid = (activityId: string) =>
  `${digest(activityId)}@sportsbuddy.app`

export const calendarService = {
  /**
   * Activity → the event a provider can deliver, or `null` when the activity
   * cannot produce a valid one.
   *
   * Every field is rebuilt explicitly rather than copied, and every string
   * that originated outside the app — the venue name and address from Google
   * Places, the buddy's display name — is normalized and bounded first. It is
   * escaped again for ICS at serialization; two different contexts, two
   * different rules.
   */
  toEventData(
    activity: Activity,
    buddyName: string,
  ): CalendarEventData | null {
    if (!isValidDocumentId(activity.id)) return null
    if (!isSportId(activity.sportId)) return null

    const startAt = new Date(activity.startAt)
    const endAt = new Date(activity.endAt)
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return null
    }
    if (endAt.getTime() <= startAt.getTime()) return null

    const sport = getSportName(activity.sportId)
    const buddy = normalizeSingleLine(buddyName, MAX_FIELD_LENGTH)
    const venueName = normalizeSingleLine(activity.venue.name, MAX_FIELD_LENGTH)
    if (!venueName) return null

    const address = normalizeSingleLine(
      activity.venue.address ?? '',
      MAX_FIELD_LENGTH,
    )

    const title = buddy ? `${sport} with ${buddy}` : sport
    const duration = formatDuration(activity.startAt, activity.endAt)

    // Deliberately minimal. No email, no user ids, no chat content, no
    // private profile fields, and no area — only what the two people agreed.
    const description = [
      'Sports Buddy activity',
      title,
      duration ? `Duration: ${duration}` : null,
      `Budget: ${formatBudget(activity.budget)} per person`,
      'Sports Buddy does not reserve the venue.',
    ]
      .filter((line): line is string => line !== null)
      .join('\n')

    return {
      uid: buildCalendarUid(activity.id),
      title,
      startAt,
      endAt,
      location: address ? `${venueName}, ${address}` : venueName,
      description,
      // Only carry a provider URL that was actually stored and validated.
      // Calendar export must not invent a link from hostile persisted data.
      ...(() => {
        const url = env.venueSource === 'google'
          ? isTrustedMapsUrl(activity.venue.googleMapsUri)
            ? activity.venue.googleMapsUri
            : null
          : isTrustedOpenStreetMapUrl(activity.venue.openStreetMapUrl)
            ? activity.venue.openStreetMapUrl
            : null
        return url ? { url } : {}
      })(),
    }
  },

  /**
   * Whether offering an export makes sense. A session that has already ended
   * is not something to put in a calendar, so the action is hidden rather
   * than shown disabled.
   */
  canAddToCalendar: (activity: Activity, now: Date) =>
    !isActivityPast(activity, now),

  /**
   * Export an activity. Returns a result rather than throwing, so the caller
   * renders a message instead of catching — and `method` says how it actually
   * arrived, so the UI can be honest about whether a file was downloaded or
   * an event was written to the device calendar.
   */
  async addActivity(
    activity: Activity,
    buddyName: string,
  ): Promise<CalendarOperationResult> {
    const event = this.toEventData(activity, buddyName)
    if (!event) return calendarFailure('invalid-activity')

    try {
      return await selectProvider().addEvent(event)
    } catch {
      return calendarFailure('failed')
    }
  },
}

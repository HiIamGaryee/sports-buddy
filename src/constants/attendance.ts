/** Never a real URL — a generic QR scanner app shows this as plain text. */
export const CHECK_IN_PAYLOAD_PREFIX = 'sportsbuddy:checkin'

/** Long enough that guessing it is not a realistic attack; regenerable any time. */
export const CHECK_IN_CODE_LENGTH = 24

/** How many of a member's own check-ins the Reliability card reads. */
export const RELIABILITY_HISTORY_LIMIT = 200

/**
 * How long after an activity ENDS a check-in is still accepted. Checking in
 * has to be possible while people are still at the venue and packing up, but
 * not days later from home — a check-in is evidence you were there.
 */
export const CHECK_IN_GRACE_MINUTES = 30

/**
 * Assumed length when an organizer gave no end time, used only to work out
 * when check-in closes. Deliberately generous.
 */
export const CHECK_IN_ASSUMED_DURATION_MINUTES = 120

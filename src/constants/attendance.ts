/** Never a real URL — a generic QR scanner app shows this as plain text. */
export const CHECK_IN_PAYLOAD_PREFIX = 'sportsbuddy:checkin'

/** Length of an auto-generated code, used until a host sets their own. */
export const CHECK_IN_CODE_LENGTH = 8

/**
 * A host may choose their own code (something they can call out at the
 * venue), so it has to be short enough to say and long enough not to be
 * guessed by someone who merely knows the activity exists.
 */
export const MIN_CHECK_IN_CODE_LENGTH = 4
export const MAX_CHECK_IN_CODE_LENGTH = 24

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

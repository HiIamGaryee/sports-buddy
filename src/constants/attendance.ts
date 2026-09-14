/** Never a real URL — a generic QR scanner app shows this as plain text. */
export const CHECK_IN_PAYLOAD_PREFIX = 'sportsbuddy:checkin'

/** Long enough that guessing it is not a realistic attack; regenerable any time. */
export const CHECK_IN_CODE_LENGTH = 24

/** How many of a member's own check-ins the Reliability card reads. */
export const RELIABILITY_HISTORY_LIMIT = 200

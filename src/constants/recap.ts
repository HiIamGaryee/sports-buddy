/** How many of a member's own group activities/attendance records the recap reads. */
export const RECAP_ACTIVITY_LIMIT = 200

/**
 * How many pages of confirmed 1-to-1 activity history the recap will page
 * through looking for the requested month (`ACTIVITY_PAGE_SIZE` each) before
 * giving up — bounds the read even for a member with a very long history.
 */
export const RECAP_MAX_LOOKBACK_PAGES = 6

/** The share-image card, in CSS pixels at 2x for a crisp share/save. */
export const RECAP_CARD_WIDTH = 720
export const RECAP_CARD_HEIGHT = 960

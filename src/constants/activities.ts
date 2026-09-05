/**
 * Every activity list limit lives here — never inlined in a repository or a
 * hook, so the page size can be tuned in one place.
 */

/** How many activities one query returns, and one "Load more" adds. */
export const ACTIVITY_PAGE_SIZE = 20

/**
 * How often the app re-derives upcoming/past while a list stays open.
 *
 * A minute is deliberately coarse. Temporal state only changes when a session
 * ends, so a per-second timer would re-render the whole list thousands of
 * times to catch a boundary the reader would not notice a minute early.
 */
export const TEMPORAL_REFRESH_MS = 60_000

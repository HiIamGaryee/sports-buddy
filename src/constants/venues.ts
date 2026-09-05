import type { SportId } from '@/types/sports-profile'

/**
 * Every venue-search knob lives here. Sports still come from
 * `src/constants/sports.ts`; this only maps them to search terms.
 */

/**
 * Sport → what to actually search for. Some sports have no commercial venue
 * of their own, so they map to the public spaces people really use.
 * `terms[0]` is the primary query; the rest widen a thin result set.
 */
export const SPORT_VENUE_SEARCH = {
  badminton: { terms: ['badminton court', 'badminton hall'], label: 'badminton courts' },
  running: { terms: ['running track', 'park', 'stadium'], label: 'running spots' },
  pickleball: { terms: ['pickleball court', 'sports complex'], label: 'pickleball courts' },
  climbing: { terms: ['climbing gym', 'bouldering gym'], label: 'climbing gyms' },
  gym: { terms: ['gym', 'fitness centre'], label: 'gyms' },
  tennis: { terms: ['tennis court'], label: 'tennis courts' },
  futsal: { terms: ['futsal court', 'futsal centre'], label: 'futsal courts' },
  basketball: { terms: ['basketball court', 'sports complex'], label: 'basketball courts' },
} as const satisfies Record<
  SportId,
  { terms: readonly string[]; label: string }
>

/** Used if a sport ever appears without a mapping. */
export const FALLBACK_VENUE_SEARCH = {
  terms: ['sports complex'],
  label: 'sports venues',
} as const

/**
 * How far around the derived planning centre to look. The floor keeps a
 * search useful when two areas are effectively the same place; the ceiling
 * stops it becoming a whole-city sweep.
 */
export const VENUE_SEARCH_RADIUS_METERS = 5_000
export const MIN_VENUE_SEARCH_RADIUS_METERS = 3_000
export const MAX_VENUE_SEARCH_RADIUS_METERS = 12_000

/**
 * When the two area centres are far apart the midpoint sits between them, so
 * the radius grows to still reach venues near either end.
 */
export const VENUE_RADIUS_SPREAD_FACTOR = 0.6

/** Hard cap on results, in the request and again after ranking. */
export const VENUE_RESULT_LIMIT = 16

/** Manual search: wait for a pause, and for enough to search on. */
export const VENUE_SEARCH_DEBOUNCE_MS = 400
export const MIN_VENUE_QUERY_LENGTH = 3

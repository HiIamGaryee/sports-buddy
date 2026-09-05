import type { Venue, VenueSearchParams, VenueSearchResult } from '@/types/venue'

/**
 * Venue discovery. The repository owns whichever provider is configured and
 * the mapping out of it; the service owns the rules (which sport, which area,
 * how results are ranked).
 *
 * Results are transient. Nothing here is persisted — only the small
 * `VenueSelection` snapshot a plan agrees on ever reaches storage.
 */
export interface VenueRepository {
  /** One intentional call. Never fired on render, hover or map pan. */
  searchVenues(params: VenueSearchParams): Promise<VenueSearchResult>
  /** `null` when the place is gone or the provider cannot answer. */
  getVenueById(placeId: string): Promise<Venue | null>
}

/** Raised when the Google provider is selected but has no key configured. */
export const VENUE_NOT_CONFIGURED = 'venue/not-configured'

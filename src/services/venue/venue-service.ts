import { getAreaCenter } from '@/constants/areas'
import {
  FALLBACK_VENUE_SEARCH,
  SPORT_VENUE_SEARCH,
  VENUE_RESULT_LIMIT,
} from '@/constants/venues'
import {
  buildGoogleMapsUrl,
  calculateHaversineDistance,
  calculateMidpoint,
  deriveVenueSearchRadius,
  isValidCoordinate,
} from '@/lib/geo'
import { venueRepository } from '@/repositories/repositories'
import {
  VENUE_FALLBACK_MESSAGES,
  VenueError,
  toVenueError,
} from '@/services/venue/venue-error'
import type { AreaId, SportId } from '@/types/sports-profile'
import type {
  PlanningSearchArea,
  Venue,
  VenueSearchResult,
  VenueSelection,
} from '@/types/venue'

/**
 * The domain rules for finding a venue. No React state, no provider details.
 *
 * PRIVACY: the only geography this service ever sees is the PUBLIC centroid
 * of an area a user chose in their profile. It never reads a device position,
 * never asks for one, and never persists a coordinate against a user.
 */
export const venueService = {
  /**
   * The fair place to look: halfway between the two AREA centroids, with a
   * radius that widens as those areas get further apart.
   *
   * `null` when either person has no area — the planner then says so rather
   * than guessing a location.
   */
  getSearchArea(
    areaA: AreaId | null,
    areaB: AreaId | null,
  ): PlanningSearchArea | null {
    const centerA = getAreaCenter(areaA)
    const centerB = getAreaCenter(areaB)
    if (!centerA || !centerB || !areaA || !areaB) return null

    return {
      center: calculateMidpoint(centerA, centerB),
      radiusMeters: deriveVenueSearchRadius(centerA, centerB),
      areaIds: areaA === areaB ? [areaA] : [areaA, areaB],
    }
  },

  /** What this sport is called when searching, for on-screen copy. */
  getSearchLabel: (sportId: SportId) =>
    SPORT_VENUE_SEARCH[sportId]?.label ?? FALLBACK_VENUE_SEARCH.label,

  /**
   * One intentional call. Results are ranked by distance from the search
   * centre — transparent and explainable, with no recommendation engine.
   */
  async search(
    sportId: SportId,
    area: PlanningSearchArea,
    query?: string,
  ): Promise<VenueSearchResult> {
    try {
      const result = await venueRepository.searchVenues({
        sportId,
        area,
        query,
        limit: VENUE_RESULT_LIMIT,
      })

      const venues = result.venues
        .filter((venue) => isValidCoordinate(venue.location))
        .sort(
          (a, b) =>
            calculateHaversineDistance(area.center, a.location) -
            calculateHaversineDistance(area.center, b.location),
        )
        // Capped again after ranking, whatever the provider returned.
        .slice(0, VENUE_RESULT_LIMIT)

      return { venues, area }
    } catch (error) {
      throw toVenueError(error, VENUE_FALLBACK_MESSAGES.search)
    }
  },

  /** Distance from the SEARCH AREA — never from a person. */
  distanceFromSearchArea: (venue: Venue, area: PlanningSearchArea) =>
    calculateHaversineDistance(area.center, venue.location),

  mapsUrl: (venue: Venue) =>
    venue.googleMapsUri ??
    buildGoogleMapsUrl({
      name: venue.name,
      placeId: venue.id,
      location: venue.location,
    }),

  /**
   * Venue → the minimal snapshot a plan stores. Ratings, categories and
   * price bands are deliberately dropped: they go stale, and they are not
   * part of what the two people agreed.
   */
  toSelection(venue: Venue): VenueSelection {
    if (!venue.id || !venue.name.trim() || !isValidCoordinate(venue.location)) {
      throw new VenueError(VENUE_FALLBACK_MESSAGES.invalid)
    }

    return {
      placeId: venue.id,
      name: venue.name.trim(),
      address: venue.address.trim(),
      location: venue.location,
      googleMapsUri: venueService.mapsUrl(venue),
    }
  },

  /** Guards a snapshot arriving from anywhere before it is persisted. */
  isValidSelection(selection: VenueSelection | null | undefined): boolean {
    return Boolean(
      selection &&
        typeof selection.placeId === 'string' &&
        selection.placeId.length > 0 &&
        typeof selection.name === 'string' &&
        selection.name.trim().length > 0 &&
        isValidCoordinate(selection.location),
    )
  },
}

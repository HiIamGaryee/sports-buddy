import { getAreaCenter } from '@/constants/areas'
import { env } from '@/config/env'
import {
  FALLBACK_VENUE_SEARCH,
  SPORT_VENUE_SEARCH,
  VENUE_RESULT_LIMIT,
} from '@/constants/venues'
import {
  buildOpenStreetMapUrl,
  buildGoogleMapsUrl,
  calculateHaversineDistance,
  calculateMidpoint,
  deriveVenueSearchRadius,
  isValidCoordinate,
} from '@/lib/geo'
import { venueRepository } from '@/repositories/repositories'
import {
  MAX_VENUE_SEARCH_LENGTH,
  MAX_VENUE_TEXT_LENGTH,
} from '@/constants/venues'
import { normalizeSingleLine } from '@/lib/sanitize'
import { isSportId } from '@/services/profile/profile-schema'
import { isValidDocumentId } from '@/lib/ids'
import { isTrustedMapsUrl, isTrustedOpenStreetMapUrl } from '@/lib/safe-url'
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
    // The sport decides the provider search terms, so an unknown id would
    // otherwise reach the request builder; and a query is a phrase, never a
    // document. Both are bounded before anything leaves the app.
    if (!isSportId(sportId)) {
      throw toVenueError(null, VENUE_FALLBACK_MESSAGES.search)
    }

    try {
      const result = await venueRepository.searchVenues({
        sportId,
        area,
        query: query
          ? normalizeSingleLine(query, MAX_VENUE_SEARCH_LENGTH)
          : undefined,
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

  /**
   * The link behind "Open in OpenStreetMap". A provider or plan URL is used
   * only when it is an HTTPS OpenStreetMap URL; otherwise the app builds one
   * from the validated coordinates.
   */
  mapsUrl: (venue: Pick<Venue, 'name' | 'location' | 'openStreetMapUrl' | 'googleMapsUri'> & { id?: string; placeId?: string }) => {
    if (env.venueSource === 'google') {
      return (isTrustedMapsUrl(venue.googleMapsUri) ? venue.googleMapsUri : null) ??
        buildGoogleMapsUrl({ name: venue.name, placeId: venue.id ?? venue.placeId, location: venue.location })
    }
    return (isTrustedOpenStreetMapUrl(venue.openStreetMapUrl) ? venue.openStreetMapUrl : null) ??
      buildOpenStreetMapUrl({ location: venue.location })
  },

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
      openStreetMapUrl:
        (isTrustedOpenStreetMapUrl(venue.openStreetMapUrl)
          ? venue.openStreetMapUrl
          : null) ?? buildOpenStreetMapUrl({ location: venue.location }),
      ...(isTrustedMapsUrl(venue.googleMapsUri)
        ? { googleMapsUri: venue.googleMapsUri }
        : {}),
    }
  },

  /** Guards a snapshot arriving from anywhere before it is persisted. */
  isValidSelection(selection: VenueSelection | null | undefined): boolean {
    if (!selection) return false
    // A selection is proposed into a shared plan document, so the other
    // participant renders whatever is stored here. Bound every field.
    return Boolean(
      isValidDocumentId(selection.placeId) &&
        typeof selection.name === 'string' &&
        selection.name.trim().length > 0 &&
        selection.name.length <= MAX_VENUE_TEXT_LENGTH &&
        (selection.address === null ||
          (typeof selection.address === 'string' &&
            selection.address.length <= MAX_VENUE_TEXT_LENGTH)) &&
        (selection.openStreetMapUrl === null ||
          isTrustedOpenStreetMapUrl(selection.openStreetMapUrl)) &&
        (selection.googleMapsUri === undefined ||
          selection.googleMapsUri === null ||
          isTrustedMapsUrl(selection.googleMapsUri)) &&
        isValidCoordinate(selection.location),
    )
  },
}

import { searchSportsVenues } from '@/services/openstreetmap/openstreetmap-service'
import type { VenueRepository } from '@/repositories/venue/venue-repository'
import type { Venue } from '@/types/venue'

/** Adapts the existing OSM/Overpass service to the planner's provider contract. */
export const openStreetMapVenueRepository: VenueRepository = {
  async searchVenues({ sportId, area, query, limit }) {
    const venues = await searchSportsVenues({
      sportId,
      locationQuery: [query?.trim(), ...area.areaIds].filter(Boolean).join(', '),
      location: area.center,
      radiusMeters: area.radiusMeters,
    })

    return {
      area,
      venues: venues.slice(0, limit).map((venue): Venue => ({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        location: { lat: venue.lat, lng: venue.lng },
        openStreetMapUrl: venue.openStreetMapUrl ?? null,
        rating: typeof venue.rating === 'number' ? venue.rating : null,
        ratingCount: typeof venue.userRatingCount === 'number' ? venue.userRatingCount : null,
        primaryType: 'sports_venue',
        priceLevel: null,
        businessStatus: venue.openNow === false ? 'CLOSED' : 'OPERATIONAL',
      })),
    }
  },

  /** OSM search results are transient; the plan stores its own venue snapshot. */
  async getVenueById() {
    return null
  },
}

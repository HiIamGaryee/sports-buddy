import { calculateHaversineDistance } from '@/lib/geo'
import { delay } from '@/repositories/mock-store'
import { MOCK_VENUES, type MockVenue } from '@/repositories/venue/mock-venues'
import type { VenueRepository } from '@/repositories/venue/venue-repository'
import type { Venue } from '@/types/venue'

/**
 * Mirrors the Google repository's contract — same shape out, same sport
 * relevance, same distance-first ordering — from a fixed local list, so the
 * whole planner is developable without a Google key or billing.
 */
const toVenue = (venue: MockVenue): Venue => ({
  id: venue.id,
  name: venue.name,
  address: venue.address,
  location: venue.location,
  // Built by the service, so the mock stores no provider URL of its own.
  googleMapsUri: null,
  rating: venue.rating,
  ratingCount: venue.ratingCount,
  primaryType: venue.primaryType,
  priceLevel: null,
  businessStatus: 'OPERATIONAL',
})

const matchesQuery = (venue: MockVenue, query: string) => {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return true
  return (
    venue.name.toLowerCase().includes(needle) ||
    venue.address.toLowerCase().includes(needle) ||
    venue.primaryType.toLowerCase().includes(needle)
  )
}

export const mockVenueRepository: VenueRepository = {
  async searchVenues({ sportId, area, query, limit }) {
    await delay(null, 350)

    const venues = (MOCK_VENUES as readonly MockVenue[])
      // Only venues that actually suit the agreed sport.
      .filter((venue) => venue.sports.includes(sportId))
      .filter((venue) => matchesQuery(venue, query ?? ''))
      .map(toVenue)
      .sort(
        (a, b) =>
          calculateHaversineDistance(area.center, a.location) -
          calculateHaversineDistance(area.center, b.location),
      )
      .slice(0, limit)

    return { venues, area }
  },

  async getVenueById(placeId: string) {
    await delay(null, 150)
    const venue = (MOCK_VENUES as readonly MockVenue[]).find(
      (entry) => entry.id === placeId,
    )
    return venue ? toVenue(venue) : null
  },
}

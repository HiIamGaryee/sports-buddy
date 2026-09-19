import { env } from '@/config/env'
import { FALLBACK_VENUE_SEARCH, SPORT_VENUE_SEARCH } from '@/constants/venues'
import {
  GOOGLE_PLACE_FIELD_MASK,
  mapGooglePlaceToVenue,
} from '@/repositories/venue/google-place-mapper'
import { VENUE_NOT_CONFIGURED, type VenueRepository } from '@/repositories/venue/venue-repository'
import type { VenueSearchParams } from '@/types/venue'

const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText'
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places'
const DETAILS_FIELD_MASK = GOOGLE_PLACE_FIELD_MASK.replaceAll('places.', '')

const providerError = (code: string) => Object.assign(new Error(code), { code })

function requireKey(): string {
  const key = env.google.mapsApiKey
  if (!key) throw providerError(VENUE_NOT_CONFIGURED)
  return key
}

const searchTerms = (sportId: VenueSearchParams['sportId']) =>
  SPORT_VENUE_SEARCH[sportId]?.terms ?? FALLBACK_VENUE_SEARCH.terms

/** Optional Google Places provider. OpenStreetMap remains the default. */
export const googleVenueRepository: VenueRepository = {
  async searchVenues({ sportId, area, query, limit }) {
    const key = requireKey()
    const textQuery = query?.trim() || searchTerms(sportId)[0]
    const response = await fetch(SEARCH_TEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': GOOGLE_PLACE_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: limit,
        locationBias: {
          circle: {
            center: { latitude: area.center.lat, longitude: area.center.lng },
            radius: area.radiusMeters,
          },
        },
      }),
    })

    if (!response.ok) throw providerError(`venue/http-${response.status}`)
    const body: unknown = await response.json()
    const places =
      body && typeof body === 'object' && Array.isArray((body as { places?: unknown }).places)
        ? (body as { places: unknown[] }).places
        : []

    return {
      area,
      venues: places.flatMap((place) => {
        const venue = mapGooglePlaceToVenue(place)
        return venue ? [venue] : []
      }),
    }
  },

  async getVenueById(placeId) {
    const key = requireKey()
    const response = await fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    })
    if (response.status === 404) return null
    if (!response.ok) throw providerError(`venue/http-${response.status}`)
    return mapGooglePlaceToVenue(await response.json())
  },
}

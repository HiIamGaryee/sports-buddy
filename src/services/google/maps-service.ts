import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

import { distanceKm } from '@/lib/distance'
import type { SportsVenue } from '@/types/sports-venue'

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()

export const hasGoogleMapsKey = Boolean(apiKey)

let ready: Promise<void> | null = null

export async function loadGoogleMaps() {
  if (!apiKey) return false
  ready ??= (async () => {
    setOptions({ key: apiKey, v: 'weekly' })
    await Promise.all([importLibrary('maps'), importLibrary('places'), importLibrary('marker')])
  })()
  await ready
  return true
}

export async function resolveLocation(location: string) {
  await loadGoogleMaps()
  const geocoder = new google.maps.Geocoder()
  const result = await geocoder.geocode({ address: location })
  const place = result.results[0]
  if (!place) return null
  const point = place.geometry.location
  return { lat: point.lat(), lng: point.lng() }
}

export async function searchSportsVenues({ query, location, radiusMeters }: { query: string; location: { lat: number; lng: number }; radiusMeters: number }) {
  await loadGoogleMaps()
  const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary
  const result = await Place.searchByText({
    textQuery: query,
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'regularOpeningHours', 'googleMapsURI'],
    locationBias: { center: location, radius: radiusMeters },
    maxResultCount: 10,
  })
  return result.places.flatMap((place): SportsVenue[] => {
    const point = place.location
    if (!place.id || !place.displayName || !point) return []
    return [{
      id: place.id,
      name: place.displayName,
      address: place.formattedAddress ?? '',
      lat: point.lat(), lng: point.lng(),
      rating: place.rating ?? undefined,
      userRatingCount: place.userRatingCount ?? undefined,
      googleMapsUri: place.googleMapsURI ?? undefined,
      distanceKm: distanceKm(location, { lat: point.lat(), lng: point.lng() }),
    }]
  })
}

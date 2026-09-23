import { buildOpenStreetMapUrl, isValidCoordinate } from '@/lib/geo'
import { isTrustedMapsUrl } from '@/lib/safe-url'
import type { Venue } from '@/types/venue'

export const GOOGLE_PLACE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.priceLevel',
  'places.businessStatus',
].join(',')

interface GooglePlace {
  id?: unknown
  displayName?: { text?: unknown }
  formattedAddress?: unknown
  location?: { latitude?: unknown; longitude?: unknown }
  googleMapsUri?: unknown
  rating?: unknown
  userRatingCount?: unknown
  primaryType?: unknown
  priceLevel?: unknown
  businessStatus?: unknown
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** Google response → the shared venue model. */
export function mapGooglePlaceToVenue(raw: unknown): Venue | null {
  if (!raw || typeof raw !== 'object') return null
  const place = raw as GooglePlace
  const id = asString(place.id)
  const name = asString(place.displayName?.text)
  const lat = asNumber(place.location?.latitude)
  const lng = asNumber(place.location?.longitude)
  if (!id || !name || lat === null || lng === null) return null

  const location = { lat, lng }
  if (!isValidCoordinate(location)) return null

  return {
    id,
    name,
    address: asString(place.formattedAddress) ?? '',
    location,
    openStreetMapUrl: buildOpenStreetMapUrl({ location }),
    googleMapsUri: isTrustedMapsUrl(place.googleMapsUri)
      ? (place.googleMapsUri as string)
      : null,
    rating: asNumber(place.rating),
    ratingCount: asNumber(place.userRatingCount),
    primaryType: asString(place.primaryType),
    priceLevel: asString(place.priceLevel),
    businessStatus: asString(place.businessStatus),
  }
}

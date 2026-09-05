import { isValidCoordinate } from '@/lib/geo'
import type { Venue } from '@/types/venue'

/**
 * The Places (New) fields the app asks for. Requesting a narrow field mask is
 * both a cost control and the reason a raw response never reaches the UI.
 */
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

/** The shape we read, not the shape Google returns. */
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

/**
 * Provider response → domain `Venue`, and the only place a malformed place is
 * rejected. `null` rather than a throw, so one bad entry cannot break a
 * result list. A place with no id, name or usable coordinates is not a venue.
 */
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
    googleMapsUri: asString(place.googleMapsUri),
    rating: asNumber(place.rating),
    ratingCount: asNumber(place.userRatingCount),
    primaryType: asString(place.primaryType),
    // A broad band such as PRICE_LEVEL_MODERATE. Never turned into ringgit.
    priceLevel: asString(place.priceLevel),
    businessStatus: asString(place.businessStatus),
  }
}

import {
  MAX_VENUE_SEARCH_RADIUS_METERS,
  MIN_VENUE_SEARCH_RADIUS_METERS,
  VENUE_RADIUS_SPREAD_FACTOR,
  VENUE_SEARCH_RADIUS_METERS,
} from '@/constants/venues'
import type { GeoPoint } from '@/types/venue'

/**
 * Pure geometry. No Firebase, no React, no browser geolocation — every input
 * is a public map coordinate, never a device position.
 */

const EARTH_RADIUS_METERS = 6_371_000
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export const isValidCoordinate = (point: GeoPoint | null | undefined) =>
  point !== null &&
  point !== undefined &&
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) &&
  point.lat >= -90 &&
  point.lat <= 90 &&
  point.lng >= -180 &&
  point.lng <= 180

/**
 * The point halfway between two AREA centroids — a fair place to search
 * around, not a meeting point and not anybody's location.
 *
 * A plain average is right at Klang Valley scale (a few tens of km, far from
 * the poles and the antimeridian); great-circle interpolation would add
 * nothing but rounding noise here.
 */
export function calculateMidpoint(a: GeoPoint, b: GeoPoint): GeoPoint {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}

/** Great-circle distance in metres. */
export function calculateHaversineDistance(a: GeoPoint, b: GeoPoint): number {
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)
  const latA = toRadians(a.lat)
  const latB = toRadians(b.lat)

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The further apart the two areas are, the wider the search — otherwise a
 * midpoint between distant areas finds nothing near either of them.
 *
 * Deliberately NOT the user's discovery `radiusKm`: that is a preference
 * about which people to see, not a statement about geography.
 */
export function deriveVenueSearchRadius(a: GeoPoint, b: GeoPoint): number {
  const spread = calculateHaversineDistance(a, b)
  return Math.round(
    Math.min(
      MAX_VENUE_SEARCH_RADIUS_METERS,
      Math.max(
        MIN_VENUE_SEARCH_RADIUS_METERS,
        VENUE_SEARCH_RADIUS_METERS + spread * VENUE_RADIUS_SPREAD_FACTOR,
      ),
    ),
  )
}

/** "2.1 km" / "800 m" — always relative to a search area, never to a person. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return ''
  return meters < 1000
    ? `${Math.round(meters / 50) * 50} m`
    : `${(meters / 1000).toFixed(1)} km`
}

/** A stable, human-readable OpenStreetMap link for a place. */
export const buildOpenStreetMapUrl = (venue: {
  location: GeoPoint
}) => {
  return `https://www.openstreetmap.org/?mlat=${venue.location.lat}&mlon=${venue.location.lng}#map=17/${venue.location.lat}/${venue.location.lng}`
}

/** Preserved for the optional Google venue provider. */
export const buildGoogleMapsUrl = (venue: {
  name: string
  placeId?: string | null
  location: GeoPoint
}) => {
  const query = encodeURIComponent(venue.name)
  const base = `https://www.google.com/maps/search/?api=1&query=${query}`
  return venue.placeId
    ? `${base}&query_place_id=${encodeURIComponent(venue.placeId)}`
    : `${base}&center=${venue.location.lat},${venue.location.lng}`
}

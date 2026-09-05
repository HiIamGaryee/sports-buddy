import type { AreaId, SportId } from '@/types/sports-profile'

/** A point on a map. Never a person. */
export interface GeoPoint {
  lat: number
  lng: number
}

/** An area's public centroid, tagged with which area it came from. */
export interface AreaLocation {
  areaId: AreaId
  center: GeoPoint
}

/**
 * Where to look for venues: a derived centre between two AREA centroids and
 * how far around it to search. Transient — it is never persisted, and it is
 * never described as anybody's location.
 */
export interface PlanningSearchArea {
  center: GeoPoint
  radiusMeters: number
  /** The areas it was derived from, for honest on-screen wording. */
  areaIds: AreaId[]
}

/**
 * A place, as the app uses it. Deliberately a small subset of what a provider
 * returns — the raw response never reaches state or storage.
 */
export interface Venue {
  /** Provider place id. Stable enough to re-open the place later. */
  id: string
  name: string
  address: string
  location: GeoPoint
  googleMapsUri: string | null
  rating: number | null
  ratingCount: number | null
  /** Provider category, e.g. `sports_complex`. Display only. */
  primaryType: string | null
  /** A broad provider band, never converted into a currency amount. */
  priceLevel: string | null
  businessStatus: string | null
}

/**
 * The minimal snapshot persisted on an agreed plan, so the venue still shows
 * if the provider is unavailable, re-ranks, or the place changes later.
 * Ratings and categories are NOT snapshotted — they go stale and are not part
 * of the agreement.
 */
export interface VenueSelection {
  placeId: string
  name: string
  address: string
  location: GeoPoint
  googleMapsUri: string | null
}

export interface VenueSearchParams {
  /** The plan's agreed sport, which chooses the search terms. */
  sportId: SportId
  area: PlanningSearchArea
  /** Free text from the user; empty means "the sport's default terms". */
  query?: string
  limit: number
}

export interface VenueSearchResult {
  venues: Venue[]
  /** Echoed back so the UI can say what it searched around. */
  area: PlanningSearchArea
}

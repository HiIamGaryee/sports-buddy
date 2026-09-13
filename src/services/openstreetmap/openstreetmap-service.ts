import { distanceKm } from '@/lib/distance'
import type { SportId } from '@/types/sports-profile'
import type { SportsVenue } from '@/types/sports-venue'

type Coordinates = { lat: number; lng: number }

type NominatimPlace = {
  place_id: number
  lat: string
  lon: string
  display_name: string
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = { elements: OverpassElement[] }

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const

const SPORT_TAGS: Record<SportId, string> = {
  badminton: 'badminton',
  tennis: 'tennis',
  climbing: 'climbing',
  running: 'running|athletics',
  pickleball: 'pickleball',
  gym: 'fitness|gym',
  futsal: 'futsal|soccer',
  basketball: 'basketball',
}

const SPORT_SEARCH_TERMS: Record<SportId, string> = {
  badminton: 'badminton',
  tennis: 'tennis',
  climbing: 'climbing gym',
  running: 'running track',
  pickleball: 'pickleball',
  gym: 'gym',
  futsal: 'futsal',
  basketball: 'basketball',
}

let lastNominatimRequestAt = 0

function openStreetMapUrl({ lat, lng }: Coordinates) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}

function coordinatesOf(element: OverpassElement): Coordinates | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lng: element.lon }
  }

  return element.center
    ? { lat: element.center.lat, lng: element.center.lon }
    : null
}

function addressOf(tags: Record<string, string> = {}) {
  const street = [tags['addr:housenumber'], tags['addr:street']]
    .filter(Boolean)
    .join(' ')
  const locality = [tags['addr:postcode'], tags['addr:city']]
    .filter(Boolean)
    .join(' ')

  return [street, locality, tags['addr:state'], tags['addr:country']]
    .filter(Boolean)
    .join(', ') || 'Address unavailable'
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`osm/request-failed:${response.status}`)
  return response.json() as Promise<T>
}

async function searchNominatim(query: string) {
  const waitMs = Math.max(0, 1_000 - (Date.now() - lastNominatimRequestAt))
  if (waitMs) await new Promise((resolve) => window.setTimeout(resolve, waitMs))
  lastNominatimRequestAt = Date.now()

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '10',
  })
  return fetchJson<NominatimPlace[]>(`${NOMINATIM_SEARCH_URL}?${params}`)
}

async function searchOverpass(query: string) {
  let lastError: unknown

  for (const url of OVERPASS_URLS) {
    try {
      return await fetchJson<OverpassResponse>(url, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(12_000),
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

/** A deliberate, user-triggered lookup; never used for autocomplete. */
export async function resolveLocation(location: string): Promise<Coordinates | null> {
  const places = await searchNominatim(location)
  const place = places[0]
  if (!place) return null

  const lat = Number(place.lat)
  const lng = Number(place.lon)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export async function searchSportsVenues({
  sportId,
  locationQuery,
  location,
  radiusMeters,
}: {
  sportId: SportId
  locationQuery: string
  location: Coordinates
  radiusMeters: number
}): Promise<SportsVenue[]> {
  const sportTag = SPORT_TAGS[sportId]
  const around = `${radiusMeters},${location.lat},${location.lng}`
  const query = `[out:json][timeout:20];(
    nwr(around:${around})[name][sport~"(${sportTag})",i];
    nwr(around:${around})[name][leisure~"^(sports_centre|fitness_centre|pitch|stadium)$",i][sport~"(${sportTag})",i];
  );out center tags 20;`
  let elements: OverpassElement[]
  try {
    elements = (await searchOverpass(query)).elements
  } catch {
    const fallback = await searchNominatim(`${SPORT_SEARCH_TERMS[sportId]} ${locationQuery}`)
    return fallback.flatMap((place): SportsVenue[] => {
      const lat = Number(place.lat)
      const lng = Number(place.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
      const point = { lat, lng }

      return [{
        id: `osm-${place.place_id}`,
        name: place.display_name.split(',')[0],
        address: place.display_name,
        lat,
        lng,
        distanceKm: distanceKm(location, point),
        openStreetMapUrl: openStreetMapUrl(point),
      }]
    }).filter((venue) => venue.distanceKm <= radiusMeters / 1_000).slice(0, 10)
  }

  return elements.flatMap((element): SportsVenue[] => {
    const point = coordinatesOf(element)
    const name = element.tags?.name
    if (!point || !name || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return []

    return [{
      id: `osm-${element.type}-${element.id}`,
      name,
      address: addressOf(element.tags),
      lat: point.lat,
      lng: point.lng,
      distanceKm: distanceKm(location, point),
      openStreetMapUrl: openStreetMapUrl(point),
    }]
  })
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, 10)
}

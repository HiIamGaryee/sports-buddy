import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import { isValidCoordinate } from '@/lib/geo'
import type {
  Activity,
  ActivityBudget,
  ActivityStatus,
} from '@/types/activity'
import type { SportId } from '@/types/sports-profile'
import type { VenueSelection } from '@/types/venue'

const toIsoOrNull = (value: unknown): string | null =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : null

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []

const ACTIVITY_STATUSES: readonly ActivityStatus[] = [
  'upcoming',
  'completed',
  'cancelled',
]

function readVenue(value: unknown): VenueSelection | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const location = data.location as Record<string, unknown> | undefined
  if (
    typeof data.placeId !== 'string' ||
    typeof data.name !== 'string' ||
    typeof location?.lat !== 'number' ||
    typeof location?.lng !== 'number'
  ) {
    return null
  }
  const point = { lat: location.lat, lng: location.lng }
  if (!isValidCoordinate(point)) return null

  return {
    placeId: data.placeId,
    name: data.name,
    address: asString(data.address),
    location: point,
    googleMapsUri:
      typeof data.googleMapsUri === 'string' ? data.googleMapsUri : null,
  }
}

function readBudget(value: unknown): ActivityBudget | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (typeof data.min !== 'number') return null
  return {
    min: data.min,
    max: typeof data.max === 'number' ? data.max : null,
    currency: 'MYR',
    unit: 'per-person',
  }
}

/**
 * Firestore document → domain object, and the only place a malformed activity
 * is rejected. `null` rather than a throw, so one bad document cannot break a
 * whole list. An activity with no time, venue or two participants is not one.
 */
export function toActivityDocument(
  id: string,
  data: DocumentData,
): Activity | null {
  const participants = asStringArray(data.participants)
  if (participants.length !== 2) return null
  const [first, second] = participants
  if (first === second) return null

  const startAt = toIsoOrNull(data.startAt)
  const endAt = toIsoOrNull(data.endAt)
  const venue = readVenue(data.venue)
  const budget = readBudget(data.budget)
  const sportId = asString(data.sportId)
  if (!startAt || !endAt || !venue || !budget || !sportId) return null

  const epoch = new Date(0).toISOString()
  const createdAt = toIsoOrNull(data.createdAt) ?? epoch

  return {
    id,
    sourcePlanId: asString(data.sourcePlanId, id),
    connectionId: asString(data.connectionId),
    participants: [first, second],
    sportId: sportId as SportId,
    startAt,
    endAt,
    budget,
    venue,
    status:
      ACTIVITY_STATUSES.find((status) => status === data.status) ?? 'upcoming',
    createdBy: asString(data.createdBy),
    createdAt,
    updatedAt: toIsoOrNull(data.updatedAt) ?? createdAt,
  }
}

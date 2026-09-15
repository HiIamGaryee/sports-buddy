import { SPORTS } from '@/constants/sports'
import type { ExerciseActivity } from '@/types/exercise'
import type { SportId } from '@/types/sports-profile'

/**
 * THE mapping boundary — the only module that knows the raw source's field
 * names. A record that cannot be understood is dropped and returns `null`
 * rather than throwing, so one bad row never costs the user their recap.
 *
 * Canonical keys are `id`, `date`, `sport`, `durationMinutes`, `venue` and
 * `distanceKm`. A few obvious aliases are accepted because the source is an
 * external file we do not control; if it settles on different names, this is
 * the single file to change.
 */

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

/** Finite and positive. `NaN`, `Infinity`, `0` and negatives are not measurements. */
const asPositiveNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

const firstString = (source: Record<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const value = asString(source[key])
    if (value) return value
  }
  return null
}

const firstNumber = (source: Record<string, unknown>, keys: readonly string[]) => {
  for (const key of keys) {
    const value = asPositiveNumber(source[key])
    if (value !== null) return value
  }
  return null
}

const SPORT_BY_ID = new Map<string, (typeof SPORTS)[number]>(
  SPORTS.map((sport) => [sport.id, sport]),
)
const SPORT_BY_NAME = new Map<string, (typeof SPORTS)[number]>(
  SPORTS.map((sport) => [sport.name.toLowerCase(), sport]),
)

/**
 * `'BadMinton'`, `'badminton'` and `'Badminton'` must all be one sport, so the
 * raw value is lowercased before lookup. A legitimate sport outside the
 * catalog keeps its own tidied label with a `null` id — deliberately NOT
 * collapsed into "Other", which would merge two unrelated real sports.
 */
function normalizeSport(raw: string): { sportId: SportId | null; sportLabel: string } {
  const key = raw.toLowerCase().trim()
  const match = SPORT_BY_ID.get(key) ?? SPORT_BY_NAME.get(key)
  if (match) return { sportId: match.id, sportLabel: match.name }
  return {
    sportId: null,
    sportLabel: raw.trim().replace(/\s+/g, ' ').slice(0, 40),
  }
}

export function toExerciseActivity(raw: unknown): ExerciseActivity | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const source = raw as Record<string, unknown>

  const rawDate = firstString(source, ['date', 'startAt', 'performedAt'])
  if (!rawDate) return null
  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) return null

  const rawSport = firstString(source, ['sport', 'sportId', 'activityType'])
  if (!rawSport) return null

  const id = firstString(source, ['id', 'activityId'])
  if (!id) return null

  return {
    id,
    date,
    ...normalizeSport(rawSport),
    durationMinutes: firstNumber(source, ['durationMinutes', 'duration', 'minutes']),
    venue: firstString(source, ['venue', 'location', 'place']),
    distanceKm: firstNumber(source, ['distanceKm', 'distance']),
  }
}

/** Drops unusable records instead of failing the whole list. */
export const toExerciseActivities = (raw: unknown): ExerciseActivity[] =>
  Array.isArray(raw)
    ? raw.flatMap((entry) => {
        const activity = toExerciseActivity(entry)
        return activity ? [activity] : []
      })
    : []

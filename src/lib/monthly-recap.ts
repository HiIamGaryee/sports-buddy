import {
  formatCalendarMonth,
  isSameCalendarMonth,
  toCalendarMonth,
  toLocalDayKey,
  type CalendarMonth,
} from '@/lib/calendar-month'
import type {
  ExerciseActivity,
  MonthlyExerciseRecap,
  RecapDistanceBreakdown,
  RecapSportBreakdown,
  RecapVenueBreakdown,
} from '@/types/exercise'

/**
 * THE recap calculation. Pure — no React, no DOM, no Firebase, no storage and
 * no clock: the target month is a parameter, so the same input always produces
 * the same recap.
 *
 * Nothing here is persisted. A recap is derived on demand from the activity
 * list, the way a compatibility score is derived per viewer.
 */

/** Sort by sessions descending, then by label so ties are stable, not arbitrary. */
const bySessionsDesc = (
  a: { sessions: number; label: string },
  b: { sessions: number; label: string },
) => b.sessions - a.sessions || a.label.localeCompare(b.label)

const emptyRecap = (month: CalendarMonth): MonthlyExerciseRecap => ({
  year: month.year,
  month: month.month,
  label: formatCalendarMonth(month),
  totalSessions: 0,
  activeDays: 0,
  sports: [],
  topSport: null,
  totalDurationMinutes: null,
  averageDurationMinutes: null,
  venues: null,
  distances: null,
})

/** A finite, positive measurement. Rejects NaN, Infinity, 0 and negatives. */
const isPositiveMeasure = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0

export function calculateMonthlyExerciseRecap(
  activities: readonly ExerciseActivity[],
  targetMonth: CalendarMonth,
): MonthlyExerciseRecap {
  // Duplicate source ids count once. Deliberately id-only: there is no
  // evidence for guessing that two different ids are "really" one session.
  const seen = new Set<string>()
  const inMonth: ExerciseActivity[] = []

  for (const activity of activities) {
    const month = toCalendarMonth(activity.date)
    // A malformed date is skipped, never thrown on — one bad record must not
    // cost the user their whole recap.
    if (!month || !isSameCalendarMonth(month, targetMonth)) continue
    if (seen.has(activity.id)) continue
    seen.add(activity.id)
    inMonth.push(activity)
  }

  if (inMonth.length === 0) return emptyRecap(targetMonth)

  // Two sessions on the same calendar day are 2 sessions but 1 active day.
  const activeDays = new Set(
    inMonth.flatMap((activity) => {
      const key = toLocalDayKey(activity.date)
      return key ? [key] : []
    }),
  ).size

  const sports = groupSports(inMonth)
  const durations = inMonth
    .map((activity) => activity.durationMinutes)
    .filter(isPositiveMeasure)
  // Averaged over the sessions that actually recorded a duration, not over
  // every session — otherwise partial data quietly drags the average down.
  const totalDurationMinutes =
    durations.length > 0
      ? durations.reduce((total, minutes) => total + minutes, 0)
      : null

  return {
    year: targetMonth.year,
    month: targetMonth.month,
    label: formatCalendarMonth(targetMonth),
    totalSessions: inMonth.length,
    activeDays,
    sports,
    topSport: sports[0] ?? null,
    totalDurationMinutes,
    averageDurationMinutes:
      totalDurationMinutes === null
        ? null
        : Math.round(totalDurationMinutes / durations.length),
    venues: groupVenues(inMonth),
    distances: groupDistances(inMonth),
  }
}

function groupSports(activities: readonly ExerciseActivity[]): RecapSportBreakdown[] {
  const counts = new Map<string, RecapSportBreakdown>()

  for (const activity of activities) {
    const key = activity.sportId ?? `label:${activity.sportLabel.toLowerCase()}`
    const existing = counts.get(key)
    if (existing) {
      existing.sessions += 1
      continue
    }
    counts.set(key, {
      sportId: activity.sportId,
      label: activity.sportLabel,
      sessions: 1,
      percentage: 0,
    })
  }

  return [...counts.values()].sort(bySessionsDesc).map((sport) => ({
    ...sport,
    percentage: Math.round((sport.sessions / activities.length) * 100),
  }))
}

/** `null` when the source recorded no venue at all, so the UI hides the section. */
function groupVenues(
  activities: readonly ExerciseActivity[],
): RecapVenueBreakdown[] | null {
  const counts = new Map<string, RecapVenueBreakdown>()

  for (const { venue } of activities) {
    const name = venue?.trim()
    if (!name) continue
    const existing = counts.get(name.toLowerCase())
    if (existing) existing.sessions += 1
    else counts.set(name.toLowerCase(), { name, sessions: 1 })
  }

  return counts.size === 0 ? null : [...counts.values()].sort(
    (a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name),
  )
}

/** `null` unless at least one session recorded a real distance. */
function groupDistances(
  activities: readonly ExerciseActivity[],
): RecapDistanceBreakdown[] | null {
  const totals = new Map<string, RecapDistanceBreakdown>()

  for (const activity of activities) {
    if (!isPositiveMeasure(activity.distanceKm)) continue
    const key = activity.sportId ?? `label:${activity.sportLabel.toLowerCase()}`
    const existing = totals.get(key)
    if (existing) existing.distanceKm += activity.distanceKm
    else
      totals.set(key, {
        sportId: activity.sportId,
        label: activity.sportLabel,
        distanceKm: activity.distanceKm,
      })
  }

  if (totals.size === 0) return null
  return [...totals.values()]
    .map((entry) => ({
      ...entry,
      // One decimal: the source is metres-accurate at best, and 24.6 km reads
      // as a real measurement where 24.600000000000001 reads as a bug.
      distanceKm: Math.round(entry.distanceKm * 10) / 10,
    }))
    .sort((a, b) => b.distanceKm - a.distanceKm || a.label.localeCompare(b.label))
}

/** `580` → `'9h 40m'`, `45` → `'45m'`. */
export function formatRecapDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

import { calculateReliability } from '@/lib/attendance'
import { groupActivitiesByMonth } from '@/lib/activity'
import { isUpcomingGroupActivity } from '@/lib/group-activity'
import type { Activity } from '@/types/activity'
import type { GroupActivity } from '@/types/group-activity'
import type { AttendanceRecord } from '@/types/attendance'
import type { MonthlyRecap, SportRecapEntry, VenueRecapEntry } from '@/types/recap'
import type { SportId } from '@/types/sports-profile'

type ConfirmedRecapActivity = Pick<Activity, 'sportId' | 'endAt'> &
  Partial<Pick<Activity, 'startAt' | 'venue'>>

/**
 * Pure monthly recap rules — no storage, no React, no clock. `now` is always
 * injected. Built ENTIRELY from data that already exists (confirmed
 * activities, group activities, attendance records) — no new collection.
 *
 * Reuses `groupActivitiesByMonth` (STEP 13) for the month bucketing rather
 * than a second implementation, and `calculateReliability` (attendance) for
 * the verified/show-up numbers — a recap does not invent its own math.
 */

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
})

/** Local month, matching the date the reader's device shows them. */
export const monthKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

function monthKeyToDate(monthKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, 1)
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const date = monthKeyToDate(monthKey)
  if (!date) return monthKey
  date.setMonth(date.getMonth() + delta)
  return monthKeyOf(date)
}

export const previousMonthKey = (monthKey: string): string => shiftMonthKey(monthKey, -1)
export const nextMonthKey = (monthKey: string): string => shiftMonthKey(monthKey, 1)

/** A recap can only ever be about a month that has already begun. */
export const isFutureMonthKey = (monthKey: string, now: Date): boolean => monthKey > monthKeyOf(now)

function formatMonthLabel(monthKey: string): string {
  const date = monthKeyToDate(monthKey)
  return date ? MONTH_LABEL_FORMAT.format(date) : monthKey
}

/**
 * Builds one month's recap from already-fetched data. `confirmedActivities`
 * should cover the requested calendar range; `groupActivities` should be
 * every one they organized or joined, any time.
 */
export function buildMonthlyRecap(
  confirmedActivities: readonly ConfirmedRecapActivity[],
  groupActivities: readonly GroupActivity[],
  attendanceRecords: readonly AttendanceRecord[],
  userId: string,
  monthKey: string,
  now: Date,
): MonthlyRecap {
  // Only sessions that have actually happened count toward a recap — a
  // group activity you joined for NEXT week is not part of this month yet.
  const startedGroupActivities = groupActivities.filter(
    (activity) => !isUpcomingGroupActivity(activity, now),
  )

  const sessionsForSport: { sportId: SportId; endAt: string; date: string; venueName?: string }[] = [
    ...confirmedActivities.map((activity) => ({
      sportId: activity.sportId,
      endAt: activity.endAt,
      date: activity.startAt ?? activity.endAt,
      venueName: activity.venue?.name,
    })),
    ...startedGroupActivities.map((activity) => ({
      sportId: activity.sportId,
      endAt: activity.endAt ?? activity.startAt,
      date: activity.startAt,
      venueName: activity.venueName,
    })),
  ]

  // Recap months are based on when the session starts. The service uses the
  // same startAt bound for Firestore, while older fixtures without startAt
  // safely fall back to their endAt.
  const monthGroup = groupActivitiesByMonth(
    sessionsForSport.map((session) => ({ ...session, endAt: session.date })),
  ).find((group) => group.key === monthKey)

  const counts = new Map<SportId, number>()
  for (const session of monthGroup?.activities ?? []) {
    counts.set(session.sportId, (counts.get(session.sportId) ?? 0) + 1)
  }
  const sports: SportRecapEntry[] = [...counts.entries()]
    .map(([sportId, count]) => ({ sportId, count }))
    .sort((a, b) => b.count - a.count || a.sportId.localeCompare(b.sportId))

  const monthSessions = sessionsForSport.filter(
    (session) => monthKeyOf(new Date(session.date)) === monthKey,
  )
  const activeDays = new Set(
    monthSessions.map((session) => {
      const date = new Date(session.date)
      return Number.isNaN(date.getTime())
        ? null
        : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    }).filter((day): day is string => day !== null),
  ).size

  const venueCounts = new Map<string, VenueRecapEntry>()
  for (const session of monthSessions) {
    const name = session.venueName?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const existing = venueCounts.get(key)
    if (existing) existing.count += 1
    else venueCounts.set(key, { name, count: 1 })
  }
  const venues = venueCounts.size > 0
    ? [...venueCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    : null

  const eligibleGroupActivityIds = startedGroupActivities
    .filter((activity) => monthKeyOf(new Date(activity.startAt)) === monthKey)
    .map((activity) => activity.id)
  const { verifiedSessions, showUpRatePercent } = calculateReliability(
    eligibleGroupActivityIds,
    attendanceRecords,
    userId,
  )

  return {
    monthKey,
    monthLabel: monthGroup?.label ?? formatMonthLabel(monthKey),
    sports,
    totalSessions: sports.reduce((sum, entry) => sum + entry.count, 0),
    topSport: sports[0] ?? null,
    activeDays,
    totalDurationMinutes: null,
    venues,
    verifiedSessions,
    showUpRatePercent,
  }
}

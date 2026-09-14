import { calculateReliability } from '@/lib/attendance'
import { groupActivitiesByMonth } from '@/lib/activity'
import { isUpcomingGroupActivity } from '@/lib/group-activity'
import type { Activity } from '@/types/activity'
import type { GroupActivity } from '@/types/group-activity'
import type { AttendanceRecord } from '@/types/attendance'
import type { MonthlyRecap, SportRecapEntry } from '@/types/recap'
import type { SportId } from '@/types/sports-profile'

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
 * should be enough of the member's past 1-to-1 history to cover `monthKey`
 * (the service pages backward only as far as needed); `groupActivities`
 * should be every one they organized or joined, any time.
 */
export function buildMonthlyRecap(
  confirmedActivities: readonly Pick<Activity, 'sportId' | 'endAt'>[],
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

  const sessionsForSport: { sportId: SportId; endAt: string }[] = [
    ...confirmedActivities.map((activity) => ({ sportId: activity.sportId, endAt: activity.endAt })),
    ...startedGroupActivities.map((activity) => ({
      sportId: activity.sportId,
      endAt: activity.endAt ?? activity.startAt,
    })),
  ]

  const monthGroup = groupActivitiesByMonth(sessionsForSport).find((group) => group.key === monthKey)

  const counts = new Map<SportId, number>()
  for (const session of monthGroup?.activities ?? []) {
    counts.set(session.sportId, (counts.get(session.sportId) ?? 0) + 1)
  }
  const sports: SportRecapEntry[] = [...counts.entries()]
    .map(([sportId, count]) => ({ sportId, count }))
    .sort((a, b) => b.count - a.count || a.sportId.localeCompare(b.sportId))

  const eligibleGroupActivityIds = startedGroupActivities
    .filter((activity) => monthKeyOf(new Date(activity.endAt ?? activity.startAt)) === monthKey)
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
    verifiedSessions,
    showUpRatePercent,
  }
}

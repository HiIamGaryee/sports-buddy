import { ACTIVITY_PAGE_SIZE } from '@/constants/activities'
import { RECAP_ACTIVITY_LIMIT, RECAP_MAX_LOOKBACK_PAGES } from '@/constants/recap'
import { buildMonthlyRecap, monthKeyOf } from '@/lib/recap'
import { isValidDocumentId } from '@/lib/ids'
import {
  activityRepository,
  attendanceRepository,
  groupActivityRepository,
} from '@/repositories/repositories'
import type { Activity } from '@/types/activity'
import type { MonthlyRecap } from '@/types/recap'

const LOAD_FAILED = "We couldn't load your recap."

/**
 * Pages backward through the member's confirmed 1-to-1 history (newest
 * first, same repository call `usePastActivities` uses) only as far as
 * `monthKey` — once the oldest activity on a page is from an earlier month,
 * everything past it is even older, so paging stops there. Bounded to
 * `RECAP_MAX_LOOKBACK_PAGES` even for a very long history.
 */
async function fetchConfirmedActivitiesThroughMonth(
  userId: string,
  monthKey: string,
  now: Date,
): Promise<Activity[]> {
  const collected: Activity[] = []
  let cursor: string | null = null

  for (let page = 0; page < RECAP_MAX_LOOKBACK_PAGES; page += 1) {
    const result = await activityRepository.getPastForUser({
      userId,
      now,
      limit: ACTIVITY_PAGE_SIZE,
      cursor,
    })
    collected.push(...result.activities)

    const oldest = result.activities.at(-1)
    if (!result.nextCursor || !oldest || monthKeyOf(new Date(oldest.endAt)) < monthKey) break
    cursor = result.nextCursor
  }

  return collected
}

/**
 * The monthly recap — computed live from data that already exists
 * (confirmed activities, group activities, attendance records). Nothing is
 * written; a recap is read-only, like a compatibility score.
 */
export const recapService = {
  async getMonthlyRecap(userId: string, monthKey: string, now: Date): Promise<MonthlyRecap> {
    if (!isValidDocumentId(userId)) throw new Error(LOAD_FAILED)
    try {
      const [confirmedActivities, hosted, joined, attendanceRecords] = await Promise.all([
        fetchConfirmedActivitiesThroughMonth(userId, monthKey, now),
        groupActivityRepository.listByOrganizer(userId, RECAP_ACTIVITY_LIMIT),
        groupActivityRepository.listJoinedBy(userId, RECAP_ACTIVITY_LIMIT),
        attendanceRepository.listByUser(userId, RECAP_ACTIVITY_LIMIT),
      ])

      return buildMonthlyRecap(
        confirmedActivities,
        [...hosted, ...joined],
        attendanceRecords,
        userId,
        monthKey,
        now,
      )
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },
}

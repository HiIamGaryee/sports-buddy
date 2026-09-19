import { RECAP_ACTIVITY_LIMIT } from '@/constants/recap'
import { buildMonthlyRecap } from '@/lib/recap'
import { isValidDocumentId } from '@/lib/ids'
import {
  activityRepository,
  attendanceRepository,
  groupActivityRepository,
} from '@/repositories/repositories'
import type { MonthlyRecap } from '@/types/recap'

const LOAD_FAILED = "We couldn't load your recap."

/**
 * Reads only the requested calendar month. The repository applies the user
 * participant filter and the start-time range in Firestore; the service only
 * removes sessions that have not ended yet.
 */
async function fetchConfirmedActivitiesForMonth(
  userId: string,
  monthKey: string,
  now: Date,
){
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return []
  }
  const startAtFrom = new Date(year, month - 1, 1)
  const startAtBefore = new Date(year, month, 1)
  return activityRepository.getForUserInRange({
      userId,
      startAtFrom,
      startAtBefore,
      now,
      limit: RECAP_ACTIVITY_LIMIT,
    })
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
        fetchConfirmedActivitiesForMonth(userId, monthKey, now),
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

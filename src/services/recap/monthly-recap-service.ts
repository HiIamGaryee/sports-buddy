import { getPreviousCalendarMonth, type CalendarMonth } from '@/lib/calendar-month'
import { calculateMonthlyExerciseRecap } from '@/lib/monthly-recap'
import { jsonExerciseHistoryRepository } from '@/repositories/exercise/json-exercise-history-repository'
import type { MonthlyExerciseRecap } from '@/types/exercise'

const LOAD_FAILED_MESSAGE = "We couldn't load your monthly recap."

/**
 * The repository retrieves exercise history; this service owns which month is
 * being recapped and hands the pure calculation its input. Nothing is
 * persisted — a recap is derived on demand, like a compatibility score.
 */
export const monthlyRecapService = {
  /**
   * `now` is injected so the boundary case (1 January recapping the previous
   * December) is reachable in a test rather than only once a year.
   */
  async getRecapFor(month: CalendarMonth): Promise<MonthlyExerciseRecap> {
    try {
      const activities = await jsonExerciseHistoryRepository.getActivities()
      return calculateMonthlyExerciseRecap(activities, month)
    } catch {
      throw new Error(LOAD_FAILED_MESSAGE)
    }
  },

  /** The previous calendar month — never "today minus 30 days". */
  getPreviousMonthRecap(now: Date): Promise<MonthlyExerciseRecap> {
    return monthlyRecapService.getRecapFor(getPreviousCalendarMonth(now))
  },
}

import { DAY_PERIODS, WEEK_DAYS } from '@/constants/profile-options'
import { formatBudget, getSportName } from '@/lib/profile-format'
import type { PlannedTime } from '@/types/planning'
import type { BudgetPreference, DayPeriod, WeekDay } from '@/types/sports-profile'

/**
 * The one place plan values become words. Reused by the planner, the summary
 * and the chat card, so a date can never be spelled two ways.
 */
const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

/** `YYYY-MM-DD` is parsed as a LOCAL date, never shifted through UTC. */
export function parsePlanDate(date: string): Date | null {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function formatPlanDate(date: string): string {
  const parsed = parsePlanDate(date)
  return parsed ? dateFormat.format(parsed) : date
}

const formatClock = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time
  const reference = new Date()
  reference.setHours(hours, minutes, 0, 0)
  return timeFormat.format(reference)
}

/** "Sat, Sep 13 · 5:00–7:00 PM" */
export function formatPlannedTime(time: PlannedTime): string {
  return `${formatPlanDate(time.date)} · ${formatClock(time.startTime)}–${formatClock(time.endTime)}`
}

export const formatSessionBudget = (budget: BudgetPreference) =>
  `${formatBudget(budget)} / person`

export const getDayLabel = (day: WeekDay) =>
  WEEK_DAYS.find((entry) => entry.id === day)?.label ?? day

export const getPeriodName = (period: DayPeriod) =>
  DAY_PERIODS.find((entry) => entry.id === period)?.label ?? period

/** "Saturday evening" — the phrasing used for a shared availability slot. */
export const formatSharedSlot = (day: WeekDay, period: DayPeriod) =>
  `${getDayLabel(day)} ${getPeriodName(period).toLowerCase()}`

export { getSportName }

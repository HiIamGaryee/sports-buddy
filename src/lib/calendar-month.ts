/**
 * Calendar-month arithmetic for the monthly recap. Pure: `now` is always
 * injected, never read here, so a recap is reproducible in a test.
 *
 * "Previous calendar month" is deliberately NOT "today minus 30 days" — on
 * 31 March that would land in February and silently drop a day of March.
 */

/** A calendar month, with `month` 1-12 rather than JavaScript's 0-11. */
export interface CalendarMonth {
  year: number
  /** 1 = January … 12 = December. */
  month: number
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** The calendar month before the one `now` falls in, rolling the year back at January. */
export function getPreviousCalendarMonth(now: Date): CalendarMonth {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** The calendar month `date` falls in, or `null` when the date is unusable. */
export function toCalendarMonth(date: Date): CalendarMonth | null {
  if (Number.isNaN(date.getTime())) return null
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export const isSameCalendarMonth = (a: CalendarMonth, b: CalendarMonth) =>
  a.year === b.year && a.month === b.month

/** `'January'` — the month name alone, for an eyebrow like "January Recap". */
export const getMonthName = ({ month }: CalendarMonth) =>
  MONTH_NAMES[month - 1] ?? ''

/** `'January 2027'` — month and year, for a heading. */
export const formatCalendarMonth = (value: CalendarMonth) =>
  `${getMonthName(value)} ${value.year}`

/** `'2027-01'` — stable, sortable, and safe inside a filename. */
export const toCalendarMonthKey = ({ year, month }: CalendarMonth) =>
  `${year}-${String(month).padStart(2, '0')}`

/**
 * A local calendar day key (`'2027-01-10'`) for counting ACTIVE DAYS.
 *
 * Built from the local date parts rather than `toISOString()`, which converts
 * to UTC first: an 8am session in UTC+8 would otherwise be filed under the
 * previous day and split one active day into two.
 */
export function toLocalDayKey(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

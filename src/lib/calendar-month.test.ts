import { describe, expect, it } from 'vitest'

import {
  formatCalendarMonth,
  getMonthName,
  getPreviousCalendarMonth,
  isSameCalendarMonth,
  toCalendarMonth,
  toCalendarMonthKey,
  toLocalDayKey,
} from '@/lib/calendar-month'

describe('getPreviousCalendarMonth', () => {
  it('returns the month before the current one', () => {
    // February 2027 → January 2027
    expect(getPreviousCalendarMonth(new Date(2027, 1, 14))).toEqual({
      year: 2027,
      month: 1,
    })
  })

  it('rolls back across the year boundary in January', () => {
    // January 2027 → December 2026
    expect(getPreviousCalendarMonth(new Date(2027, 0, 1))).toEqual({
      year: 2026,
      month: 12,
    })
  })

  it('returns February for a date in March', () => {
    expect(getPreviousCalendarMonth(new Date(2027, 2, 9))).toEqual({
      year: 2027,
      month: 2,
    })
  })

  it('is not "30 days ago" — 31 March still recaps February', () => {
    // 31 March minus 30 days is 1 March, which would recap the WRONG month.
    expect(getPreviousCalendarMonth(new Date(2027, 2, 31))).toEqual({
      year: 2027,
      month: 2,
    })
  })

  it('handles a leap-year February', () => {
    expect(getPreviousCalendarMonth(new Date(2028, 2, 1))).toEqual({
      year: 2028,
      month: 2,
    })
  })
})

describe('calendar month helpers', () => {
  it('reads the calendar month a date falls in', () => {
    expect(toCalendarMonth(new Date(2026, 7, 3))).toEqual({ year: 2026, month: 8 })
  })

  it('returns null for an invalid date', () => {
    expect(toCalendarMonth(new Date('nonsense'))).toBeNull()
  })

  it('compares months', () => {
    expect(isSameCalendarMonth({ year: 2026, month: 8 }, { year: 2026, month: 8 })).toBe(true)
    expect(isSameCalendarMonth({ year: 2026, month: 8 }, { year: 2025, month: 8 })).toBe(false)
  })

  it('formats a month name and label', () => {
    expect(getMonthName({ year: 2027, month: 1 })).toBe('January')
    expect(formatCalendarMonth({ year: 2027, month: 1 })).toBe('January 2027')
  })

  it('builds a sortable month key', () => {
    expect(toCalendarMonthKey({ year: 2027, month: 1 })).toBe('2027-01')
  })
})

describe('toLocalDayKey', () => {
  it('uses local date parts, not UTC', () => {
    // 08:00 local is the same calendar day locally whatever the zone offset.
    const date = new Date(2026, 7, 3, 8, 0, 0)
    expect(toLocalDayKey(date)).toBe('2026-08-03')
  })

  it('pads month and day', () => {
    expect(toLocalDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('returns null for an invalid date', () => {
    expect(toLocalDayKey(new Date('nonsense'))).toBeNull()
  })
})

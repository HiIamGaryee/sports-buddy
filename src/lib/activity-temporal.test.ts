import { describe, expect, it } from 'vitest'

import {
  compareByEndDescending,
  compareByStart,
  getActivityTemporalState,
  getNextActivity,
  groupActivitiesByMonth,
  isActivityHappeningNow,
  isActivityPast,
  normalizeActivityStatus,
} from '@/lib/activity'

/**
 * Every one of these injects `now`. That is the point of the design: a rule
 * that reads the clock itself cannot be tested at a boundary, and would make
 * the suite fail depending on the hour it ran.
 */
const NOW = new Date('2026-09-12T12:00:00.000Z')

const at = (startAt: string, endAt: string) => ({ startAt, endAt })

describe('getActivityTemporalState', () => {
  it('classifies a session that has not started as upcoming', () => {
    const activity = at('2026-09-20T09:00:00Z', '2026-09-20T11:00:00Z')
    expect(getActivityTemporalState(activity, NOW)).toBe('upcoming')
  })

  it('keeps a session in progress under upcoming', () => {
    // Started an hour ago, ends in an hour. You are still going to it.
    const activity = at('2026-09-12T11:00:00Z', '2026-09-12T13:00:00Z')
    expect(getActivityTemporalState(activity, NOW)).toBe('upcoming')
  })

  it('treats a session ending in one second as upcoming', () => {
    const activity = at('2026-09-12T10:00:00Z', '2026-09-12T12:00:01Z')
    expect(getActivityTemporalState(activity, NOW)).toBe('upcoming')
  })

  it('treats endAt exactly equal to now as past', () => {
    // The boundary is inclusive on the past side: at its end time it is over.
    const activity = at('2026-09-12T10:00:00Z', '2026-09-12T12:00:00Z')
    expect(getActivityTemporalState(activity, NOW)).toBe('past')
  })

  it('classifies a finished session as past', () => {
    const activity = at('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z')
    expect(getActivityTemporalState(activity, NOW)).toBe('past')
    expect(isActivityPast(activity, NOW)).toBe(true)
  })

  it('falls back to upcoming for a corrupted timestamp', () => {
    // Better visible in the tab people check than vanished into history.
    const activity = at('not-a-date', 'also-not-a-date')
    expect(getActivityTemporalState(activity, NOW)).toBe('upcoming')
  })

  it('is decided by the injected now, not the real clock', () => {
    const activity = at('2026-09-12T09:00:00Z', '2026-09-12T11:00:00Z')
    expect(
      getActivityTemporalState(activity, new Date('2026-09-12T10:00:00Z')),
    ).toBe('upcoming')
    expect(
      getActivityTemporalState(activity, new Date('2026-09-13T10:00:00Z')),
    ).toBe('past')
  })
})

describe('isActivityHappeningNow', () => {
  it('is true only between start and end', () => {
    expect(
      isActivityHappeningNow(
        at('2026-09-12T11:00:00Z', '2026-09-12T13:00:00Z'),
        NOW,
      ),
    ).toBe(true)
    expect(
      isActivityHappeningNow(
        at('2026-09-12T13:00:00Z', '2026-09-12T15:00:00Z'),
        NOW,
      ),
    ).toBe(false)
    expect(
      isActivityHappeningNow(
        at('2026-09-12T09:00:00Z', '2026-09-12T12:00:00Z'),
        NOW,
      ),
    ).toBe(false)
  })
})

describe('ordering', () => {
  it('sorts upcoming soonest first', () => {
    const activities = [
      at('2026-09-20T09:00:00Z', '2026-09-20T11:00:00Z'),
      at('2026-09-14T09:00:00Z', '2026-09-14T11:00:00Z'),
      at('2026-09-30T09:00:00Z', '2026-09-30T11:00:00Z'),
    ]
    expect([...activities].sort(compareByStart).map((a) => a.startAt)).toEqual([
      '2026-09-14T09:00:00Z',
      '2026-09-20T09:00:00Z',
      '2026-09-30T09:00:00Z',
    ])
  })

  it('sorts history most recently finished first', () => {
    const activities = [
      at('2026-08-01T09:00:00Z', '2026-08-01T11:00:00Z'),
      at('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'),
      at('2026-07-01T09:00:00Z', '2026-07-01T11:00:00Z'),
    ]
    expect(
      [...activities].sort(compareByEndDescending).map((a) => a.endAt),
    ).toEqual([
      '2026-09-01T11:00:00Z',
      '2026-08-01T11:00:00Z',
      '2026-07-01T11:00:00Z',
    ])
  })
})

describe('getNextActivity', () => {
  it('picks the soonest session that has not ended', () => {
    const activities = [
      at('2026-09-30T09:00:00Z', '2026-09-30T11:00:00Z'),
      at('2026-09-14T09:00:00Z', '2026-09-14T11:00:00Z'),
    ]
    expect(getNextActivity(activities, NOW)?.startAt).toBe(
      '2026-09-14T09:00:00Z',
    )
  })

  it('never returns a finished session, however early it sorts', () => {
    // The regression this guards: Home reading the head of a list that still
    // contained yesterday's activity because a stored status said "upcoming".
    const activities = [
      at('2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z'),
      at('2026-09-20T09:00:00Z', '2026-09-20T11:00:00Z'),
    ]
    expect(getNextActivity(activities, NOW)?.startAt).toBe(
      '2026-09-20T09:00:00Z',
    )
  })

  it('prefers a session in progress over a later one', () => {
    const activities = [
      at('2026-09-20T09:00:00Z', '2026-09-20T11:00:00Z'),
      at('2026-09-12T11:00:00Z', '2026-09-12T13:00:00Z'),
    ]
    expect(getNextActivity(activities, NOW)?.startAt).toBe(
      '2026-09-12T11:00:00Z',
    )
  })

  it('returns null when everything has finished', () => {
    expect(
      getNextActivity([at('2026-01-01T09:00:00Z', '2026-01-01T11:00:00Z')], NOW),
    ).toBeNull()
  })
})

describe('normalizeActivityStatus', () => {
  it('maps every legacy STEP 12 status to confirmed', () => {
    // Existing documents keep working; nobody migrates or deletes data.
    expect(normalizeActivityStatus('upcoming')).toBe('confirmed')
    expect(normalizeActivityStatus('completed')).toBe('confirmed')
    expect(normalizeActivityStatus('cancelled')).toBe('confirmed')
    expect(normalizeActivityStatus('confirmed')).toBe('confirmed')
  })

  it('maps a missing or nonsense status to confirmed', () => {
    expect(normalizeActivityStatus(undefined)).toBe('confirmed')
    expect(normalizeActivityStatus(null)).toBe('confirmed')
    expect(normalizeActivityStatus(42)).toBe('confirmed')
  })
})

describe('groupActivitiesByMonth', () => {
  it('groups by the month a session ended, newest month first', () => {
    const groups = groupActivitiesByMonth([
      at('2026-08-03T09:00:00Z', '2026-08-03T11:00:00Z'),
      at('2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'),
      at('2026-09-02T09:00:00Z', '2026-09-02T11:00:00Z'),
      at('2026-07-20T09:00:00Z', '2026-07-20T11:00:00Z'),
    ])

    expect(groups.map((group) => group.key)).toEqual([
      '2026-09',
      '2026-08',
      '2026-07',
    ])
    expect(groups[0].activities).toHaveLength(2)
    // Newest first inside a month too.
    expect(groups[0].activities[0].endAt).toBe('2026-09-10T11:00:00Z')
  })

  it('gives each group a display label', () => {
    const [group] = groupActivitiesByMonth([
      at('2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'),
    ])
    expect(group.label).toMatch(/2026/)
    expect(group.label.length).toBeGreaterThan(4)
  })

  it('skips a corrupted record instead of throwing', () => {
    const groups = groupActivitiesByMonth([
      at('2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'),
      at('nonsense', 'nonsense'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].activities).toHaveLength(1)
  })

  it('returns nothing for an empty history', () => {
    expect(groupActivitiesByMonth([])).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'

import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import {
  buildMonthlyRecap,
  isFutureMonthKey,
  monthKeyOf,
  nextMonthKey,
  previousMonthKey,
} from '@/lib/recap'
import type { Activity } from '@/types/activity'
import type { AttendanceRecord } from '@/types/attendance'
import type { GroupActivity } from '@/types/group-activity'

const NOW = new Date('2026-09-20T12:00:00.000Z')
const USER = 'user_1'

describe('month keys', () => {
  it('formats and shifts a month key', () => {
    expect(monthKeyOf(new Date('2026-09-05T00:00:00.000Z'))).toBe('2026-09')
    expect(nextMonthKey('2026-09')).toBe('2026-10')
    expect(previousMonthKey('2026-09')).toBe('2026-08')
  })

  it('rolls over a year boundary', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01')
    expect(previousMonthKey('2026-01')).toBe('2025-12')
  })

  it('treats a later month as future', () => {
    expect(isFutureMonthKey('2026-10', NOW)).toBe(true)
    expect(isFutureMonthKey('2026-09', NOW)).toBe(false)
    expect(isFutureMonthKey('2026-08', NOW)).toBe(false)
  })
})

describe('buildMonthlyRecap', () => {
  const activity = (sportId: string, endAt: string): Pick<Activity, 'sportId' | 'endAt'> => ({
    sportId: sportId as Activity['sportId'],
    endAt,
  })

  const groupActivity = (overrides: Partial<GroupActivity> = {}): GroupActivity => ({
    id: 'g1',
    organizerId: 'organizer',
    sportId: SPORTS[0].id,
    title: 'Meetup',
    description: '',
    startAt: '2026-09-10T09:00:00.000Z',
    endAt: null,
    timeZone: 'Asia/Kuala_Lumpur',
    areaId: AREAS[0].id,
    venueName: 'Court',
    budget: { min: 10, max: 20 },
    preferredSkillLevel: 'any',
    maxParticipants: 8,
    participantIds: [USER],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  })

  const record = (activityId: string, userId: string): AttendanceRecord => ({
    id: `${activityId}__${userId}`,
    activityId,
    userId,
    checkedInAt: NOW.toISOString(),
  })

  it('counts confirmed activities and started group activities in the target month', () => {
    const recap = buildMonthlyRecap(
      [
        activity('badminton', '2026-09-05T10:00:00.000Z'),
        activity('badminton', '2026-09-12T10:00:00.000Z'),
        activity('climbing', '2026-08-20T10:00:00.000Z'), // different month
      ],
      [groupActivity({ id: 'g1', sportId: 'climbing' })],
      [],
      USER,
      '2026-09',
      NOW,
    )

    expect(recap.monthKey).toBe('2026-09')
    expect(recap.monthLabel).toMatch(/2026/)
    expect(recap.totalSessions).toBe(3)
    expect(recap.sports).toEqual([
      { sportId: 'badminton', count: 2 },
      { sportId: 'climbing', count: 1 },
    ])
  })

  it('excludes a joined group activity that has not started yet', () => {
    const recap = buildMonthlyRecap(
      [],
      [groupActivity({ id: 'g1', startAt: '2026-09-25T09:00:00.000Z' })],
      [],
      USER,
      '2026-09',
      NOW,
    )
    expect(recap.totalSessions).toBe(0)
    expect(recap.sports).toEqual([])
  })

  it('returns an empty, not missing, recap for a month with nothing in it', () => {
    const recap = buildMonthlyRecap([], [], [], USER, '2026-06', NOW)
    expect(recap.totalSessions).toBe(0)
    expect(recap.sports).toEqual([])
    expect(recap.monthLabel).toMatch(/June 2026/)
    expect(recap.verifiedSessions).toBe(0)
    expect(recap.showUpRatePercent).toBeNull()
  })

  it('computes verified sessions and show-up rate from started group activities only', () => {
    const recap = buildMonthlyRecap(
      [],
      [
        groupActivity({ id: 'g1', startAt: '2026-09-05T00:00:00.000Z' }),
        groupActivity({ id: 'g2', startAt: '2026-09-10T00:00:00.000Z' }),
        // Not started yet — must not count toward the eligible denominator.
        groupActivity({ id: 'g3', startAt: '2026-09-25T00:00:00.000Z' }),
      ],
      [record('g1', USER)],
      USER,
      '2026-09',
      NOW,
    )
    expect(recap.verifiedSessions).toBe(1)
    expect(recap.showUpRatePercent).toBe(50)
  })

  it('never counts someone else\'s check-in', () => {
    const recap = buildMonthlyRecap(
      [],
      [groupActivity({ id: 'g1', startAt: '2026-09-05T00:00:00.000Z' })],
      [record('g1', 'someone-else')],
      USER,
      '2026-09',
      NOW,
    )
    expect(recap.verifiedSessions).toBe(0)
    expect(recap.showUpRatePercent).toBe(0)
  })
})

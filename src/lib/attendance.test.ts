import { describe, expect, it } from 'vitest'

import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import {
  buildCheckInPayload,
  calculateReliability,
  canCheckIn,
  generateCheckInCode,
  parseCheckInPayload,
} from '@/lib/attendance'
import type { AttendanceRecord } from '@/types/attendance'
import type { GroupActivity } from '@/types/group-activity'

const NOW = new Date('2026-09-14T02:00:00.000Z')

const activity = (overrides: Partial<GroupActivity> = {}): GroupActivity => ({
  id: 'activity_1',
  organizerId: 'organizer',
  sportId: SPORTS[0].id,
  title: 'Meetup',
  description: '',
  startAt: '2026-09-14T01:00:00.000Z',
  endAt: null,
  timeZone: 'Asia/Kuala_Lumpur',
  areaId: AREAS[0].id,
  venueName: 'Court',
  budget: { min: 10, max: 20 },
  preferredSkillLevel: 'any',
  maxParticipants: 8,
  participantIds: ['alex'],
  createdAt: null,
  updatedAt: null,
  ...overrides,
})

describe('check-in payload', () => {
  it('round-trips an activity id and code', () => {
    const payload = buildCheckInPayload('activity_1', 'ABC123')
    expect(payload).toBe('sportsbuddy:checkin:activity_1:ABC123')
    expect(parseCheckInPayload(payload)).toEqual({ activityId: 'activity_1', code: 'ABC123' })
  })

  it('rejects anything that is not our own payload shape', () => {
    expect(parseCheckInPayload('https://evil.com')).toBeNull()
    expect(parseCheckInPayload('sportsbuddy:checkin:activity_1')).toBeNull()
    expect(parseCheckInPayload('random garbage')).toBeNull()
    expect(parseCheckInPayload('sportsbuddy:checkin:..:code')).toBeNull()
  })

  it('generates codes of the requested length from a safe alphabet', () => {
    const code = generateCheckInCode(24)
    expect(code).toHaveLength(24)
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/)
  })
})

describe('canCheckIn', () => {
  it('lets a participant or the organizer check in once it has started', () => {
    const started = activity()
    expect(canCheckIn(started, 'alex', NOW)).toBe(true)
    expect(canCheckIn(started, 'organizer', NOW)).toBe(true)
  })

  it('refuses before it starts, and refuses a stranger', () => {
    const notStarted = activity({ startAt: '2026-09-20T00:00:00.000Z' })
    expect(canCheckIn(notStarted, 'alex', NOW)).toBe(false)
    expect(canCheckIn(activity(), 'stranger', NOW)).toBe(false)
  })
})

describe('calculateReliability', () => {
  const record = (activityId: string, userId: string): AttendanceRecord => ({
    id: `${activityId}__${userId}`,
    activityId,
    userId,
    checkedInAt: NOW.toISOString(),
  })

  it('is null, not zero, with nothing started yet', () => {
    expect(calculateReliability([], [], 'alex')).toEqual({
      verifiedSessions: 0,
      showUpRatePercent: null,
    })
  })

  it('counts only this user\'s own check-ins against their own started joins', () => {
    const result = calculateReliability(
      ['a', 'b', 'c', 'd'],
      [record('a', 'alex'), record('b', 'alex'), record('c', 'someone-else')],
      'alex',
    )
    expect(result).toEqual({ verifiedSessions: 2, showUpRatePercent: 50 })
  })

  it('rounds the percentage', () => {
    const result = calculateReliability(['a', 'b', 'c'], [record('a', 'alex')], 'alex')
    expect(result.showUpRatePercent).toBe(33)
  })
})

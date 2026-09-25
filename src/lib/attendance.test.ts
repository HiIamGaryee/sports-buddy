import { describe, expect, it } from 'vitest'

import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import {
  buildCheckInPayload,
  calculateReliability,
  canCheckIn,
  generateCheckInCode,
  getCheckInCodeError,
  isCheckInOpen,
  normalizeCheckInCode,
  parseCheckInPayload,
  toCheckInSubject,
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
    expect(canCheckIn(toCheckInSubject(started), 'alex', NOW)).toBe(true)
    expect(canCheckIn(toCheckInSubject(started), 'organizer', NOW)).toBe(true)
  })

  it('refuses before it starts, and refuses a stranger', () => {
    const notStarted = activity({ startAt: '2026-09-20T00:00:00.000Z' })
    expect(canCheckIn(toCheckInSubject(notStarted), 'alex', NOW)).toBe(false)
    expect(canCheckIn(toCheckInSubject(activity()), 'stranger', NOW)).toBe(false)
  })
})

describe('a host-chosen check-in code', () => {
  it('ignores case and spaces, so a typed code still matches', () => {
    expect(normalizeCheckInCode('  court 7 ')).toBe('COURT7')
    expect(normalizeCheckInCode('cOuRt7')).toBe('COURT7')
  })

  it('accepts something sayable', () => {
    expect(getCheckInCodeError('COURT7')).toBeNull()
    expect(getCheckInCodeError('court 7')).toBeNull()
  })

  it('refuses codes that are too short, too long or not letters and digits', () => {
    expect(getCheckInCodeError('AB1')).not.toBeNull()
    expect(getCheckInCodeError('A'.repeat(25))).not.toBeNull()
    expect(getCheckInCodeError('COURT-7')).not.toBeNull()
    expect(getCheckInCodeError('')).not.toBeNull()
  })
})

describe('the check-in window', () => {
  it('closes 30 minutes after the end time', () => {
    // Ends 02:00; open at 02:29, shut at 02:31.
    const session = activity({
      startAt: '2026-09-14T01:00:00.000Z',
      endAt: '2026-09-14T02:00:00.000Z',
    })
    expect(isCheckInOpen(toCheckInSubject(session), new Date('2026-09-14T02:29:00.000Z'))).toBe(true)
    expect(isCheckInOpen(toCheckInSubject(session), new Date('2026-09-14T02:31:00.000Z'))).toBe(false)
  })

  it('assumes a two-hour session when no end time was given', () => {
    const session = activity({ startAt: '2026-09-14T01:00:00.000Z', endAt: null })
    expect(isCheckInOpen(toCheckInSubject(session), new Date('2026-09-14T03:29:00.000Z'))).toBe(true)
    expect(isCheckInOpen(toCheckInSubject(session), new Date('2026-09-14T03:31:00.000Z'))).toBe(false)
  })

  it('is shut before the start, however close', () => {
    const session = activity({ startAt: '2026-09-14T01:00:00.000Z' })
    expect(isCheckInOpen(toCheckInSubject(session), new Date('2026-09-14T00:59:00.000Z'))).toBe(false)
    expect(isCheckInOpen(toCheckInSubject(session), new Date('2026-09-14T01:00:00.000Z'))).toBe(true)
  })

  it('refuses a participant once the window has closed', () => {
    const yesterday = activity({ startAt: '2026-09-13T01:00:00.000Z' })
    expect(canCheckIn(toCheckInSubject(yesterday), 'alex', NOW)).toBe(false)
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
      eligibleSessions: 0,
      showUpRatePercent: null,
    })
  })

  it('counts only this user\'s own check-ins against their own started joins', () => {
    const result = calculateReliability(
      ['a', 'b', 'c', 'd'],
      [record('a', 'alex'), record('b', 'alex'), record('c', 'someone-else')],
      'alex',
    )
    expect(result).toEqual({ verifiedSessions: 2, eligibleSessions: 4, showUpRatePercent: 50 })
  })

  it('rounds the percentage', () => {
    const result = calculateReliability(['a', 'b', 'c'], [record('a', 'alex')], 'alex')
    expect(result.showUpRatePercent).toBe(33)
  })
})

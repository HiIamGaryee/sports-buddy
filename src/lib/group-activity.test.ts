import { describe, expect, it } from 'vitest'

import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import {
  applyJoinGroupActivity,
  applyLeaveGroupActivity,
  applyRemoveParticipant,
  compareGroupActivities,
  getGroupActivityError,
  getGroupActivityViewerState,
  groupActivitySpotsLeft,
  hasGroupActivityEnded,
  isGroupActivityFull,
  isUpcomingGroupActivity,
  toCreateGroupActivityInput,
} from '@/lib/group-activity'
import type { GroupActivity, GroupActivityDraft } from '@/types/group-activity'

const ZONE = 'Asia/Kuala_Lumpur'
// Fixed "now": 2026-09-14 10:00 in Kuala Lumpur (UTC+8).
const NOW = new Date('2026-09-14T02:00:00.000Z')

const draft = (overrides: Partial<GroupActivityDraft> = {}): GroupActivityDraft => ({
  sportId: SPORTS[0].id,
  title: 'Saturday Badminton Meetup',
  description: 'Casual doubles, all welcome.',
  localStartDateTime: '2026-09-15T17:00',
  localEndDateTime: '',
  timeZone: ZONE,
  areaId: AREAS[0].id,
  venueName: 'KL Sports City',
  budget: { min: 10, max: 20 },
  preferredSkillLevel: 'any',
  maxParticipants: 8,
  ...overrides,
})

describe('getGroupActivityError', () => {
  it('accepts a complete upcoming activity', () => {
    expect(getGroupActivityError(draft(), NOW)).toBeNull()
  })

  it('accepts an explicit end time after the start', () => {
    expect(
      getGroupActivityError(draft({ localEndDateTime: '2026-09-15T19:00' }), NOW),
    ).toBeNull()
  })

  it('rejects a blank title, and one over the length limit', () => {
    expect(getGroupActivityError(draft({ title: '' }), NOW)).toBe('Give the activity a title.')
    expect(getGroupActivityError(draft({ title: 'a'.repeat(61) }), NOW)).toMatch(/under 60/)
  })

  it('rejects an end time before or equal to the start', () => {
    expect(
      getGroupActivityError(draft({ localEndDateTime: '2026-09-15T16:00' }), NOW),
    ).toBe('The end time must be after the start.')
    expect(
      getGroupActivityError(draft({ localEndDateTime: '2026-09-15T17:00' }), NOW),
    ).toBe('The end time must be after the start.')
  })

  it('rejects a time in the past, or a malformed one', () => {
    expect(getGroupActivityError(draft({ localStartDateTime: '2026-09-13T17:00' }), NOW)).toBe(
      'Choose a start time in the future.',
    )
    expect(getGroupActivityError(draft({ localStartDateTime: 'tomorrow' }), NOW)).toBe(
      'Choose when the activity starts.',
    )
  })

  it('rejects a participant cap outside the allowed range', () => {
    expect(getGroupActivityError(draft({ maxParticipants: 1 }), NOW)).toMatch(/between 2 and 30/)
    expect(getGroupActivityError(draft({ maxParticipants: 31 }), NOW)).toMatch(/between 2 and 30/)
    expect(getGroupActivityError(draft({ maxParticipants: 1.5 }), NOW)).toMatch(/between 2 and 30/)
  })

  it('rejects a sport or area outside the datasets', () => {
    expect(getGroupActivityError(draft({ sportId: 'quidditch' as never }), NOW)).toBe(
      'Choose a sport.',
    )
    expect(getGroupActivityError(draft({ areaId: 'atlantis' as never }), NOW)).toBe(
      'Choose the area.',
    )
  })
})

describe('toCreateGroupActivityInput', () => {
  it('resolves the local time in the organizer zone to a real instant', () => {
    const input = toCreateGroupActivityInput('organizer_1', draft(), NOW)
    // 17:00 in Kuala Lumpur is 09:00 UTC.
    expect(input?.startAt).toBe('2026-09-15T09:00:00.000Z')
    expect(input?.endAt).toBeNull()
  })

  it('returns null for an invalid draft, so nothing can be written', () => {
    expect(toCreateGroupActivityInput('organizer_1', draft({ sportId: null }), NOW)).toBeNull()
  })

  it('writes only the known fields', () => {
    const withExtra = { ...draft(), isAdmin: true } as GroupActivityDraft
    const input = toCreateGroupActivityInput('organizer_1', withExtra, NOW)
    expect(Object.keys(input ?? {}).sort()).toEqual(
      [
        'areaId', 'budget', 'description', 'endAt', 'maxParticipants', 'organizerId',
        'preferredSkillLevel', 'sportId', 'startAt', 'timeZone', 'title', 'venueName',
      ].sort(),
    )
  })
})

describe('ordering and viewer state', () => {
  const ORGANIZER = 'organizer'
  const ALEX = 'alex'
  const BEN = 'ben'

  const activity = (overrides: Partial<GroupActivity> = {}): GroupActivity => ({
    id: 'a',
    organizerId: ORGANIZER,
    sportId: SPORTS[0].id,
    title: 'Meetup',
    description: '',
    startAt: '2026-09-15T09:00:00.000Z',
    endAt: null,
    timeZone: ZONE,
    areaId: AREAS[0].id,
    venueName: 'Court',
    budget: { min: 10, max: 20 },
    preferredSkillLevel: 'any',
    maxParticipants: 2,
    participantIds: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  })

  it('sorts soonest first with a stable tie-break', () => {
    const a = activity({ id: 'a', startAt: '2026-09-16T00:00:00.000Z' })
    const b = activity({ id: 'b', startAt: '2026-09-15T00:00:00.000Z' })
    expect([a, b].sort(compareGroupActivities)).toEqual([b, a])
  })

  it('treats the organizer, a participant, and everyone else differently', () => {
    const full = activity({ participantIds: [ALEX], maxParticipants: 1 })
    expect(getGroupActivityViewerState(full, ORGANIZER, NOW)).toBe('organizer')
    expect(getGroupActivityViewerState(full, ALEX, NOW)).toBe('joined')
    expect(getGroupActivityViewerState(full, BEN, NOW)).toBe('full')
    expect(isGroupActivityFull(full)).toBe(true)
    expect(groupActivitySpotsLeft(full)).toBe(0)
  })

  it('offers Join when a spot is free and it has not started', () => {
    const open = activity()
    expect(getGroupActivityViewerState(open, BEN, NOW)).toBe('can-join')
    expect(groupActivitySpotsLeft(open)).toBe(2)
  })

  it('reads as past once it has started, even for a stranger', () => {
    const started = activity({ startAt: '2020-01-01T00:00:00.000Z' })
    expect(getGroupActivityViewerState(started, BEN, NOW)).toBe('past')
    expect(isUpcomingGroupActivity(started, NOW)).toBe(false)
  })

  it('keeps a participant joined even after it starts', () => {
    const started = activity({ startAt: '2020-01-01T00:00:00.000Z', participantIds: [ALEX] })
    expect(getGroupActivityViewerState(started, ALEX, NOW)).toBe('joined')
  })

  it('is not ended while in progress, unlike the start-based check', () => {
    const inProgress = activity({
      startAt: '2020-01-01T00:00:00.000Z',
      endAt: '2099-01-01T00:00:00.000Z',
    })
    expect(isUpcomingGroupActivity(inProgress, NOW)).toBe(false)
    expect(hasGroupActivityEnded(inProgress, NOW)).toBe(false)
  })

  it('is ended once the end time passes', () => {
    const ended = activity({
      startAt: '2020-01-01T00:00:00.000Z',
      endAt: '2020-01-01T02:00:00.000Z',
    })
    expect(hasGroupActivityEnded(ended, NOW)).toBe(true)
  })

  it('falls back to the start time when no end was given', () => {
    const noEnd = activity({ startAt: '2020-01-01T00:00:00.000Z', endAt: null })
    expect(hasGroupActivityEnded(noEnd, NOW)).toBe(true)
    const upcoming = activity({ startAt: '2099-01-01T00:00:00.000Z', endAt: null })
    expect(hasGroupActivityEnded(upcoming, NOW)).toBe(false)
  })
})

describe('joining and leaving a group activity', () => {
  const ORGANIZER = 'organizer'
  const ALEX = 'alex'
  const BEN = 'ben'

  const activity = (overrides: Partial<GroupActivity> = {}): GroupActivity => ({
    id: 'a',
    organizerId: ORGANIZER,
    sportId: SPORTS[0].id,
    title: 'Meetup',
    description: '',
    startAt: '2026-09-15T09:00:00.000Z',
    endAt: null,
    timeZone: ZONE,
    areaId: AREAS[0].id,
    venueName: 'Court',
    budget: { min: 10, max: 20 },
    preferredSkillLevel: 'any',
    maxParticipants: 1,
    participantIds: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  })

  it('takes a free spot, then refuses once full', () => {
    const next = applyJoinGroupActivity(activity(), ALEX, NOW)
    expect(next).toEqual({ ok: true, unchanged: false, participantIds: [ALEX] })
    const full = activity({ participantIds: [ALEX] })
    expect(applyJoinGroupActivity(full, BEN, NOW)).toEqual({ ok: false, reason: 'full' })
  })

  it('is idempotent for someone already in', () => {
    const already = activity({ participantIds: [ALEX] })
    expect(applyJoinGroupActivity(already, ALEX, NOW)).toEqual({
      ok: true,
      unchanged: true,
      participantIds: [ALEX],
    })
  })

  it('refuses the organizer joining their own activity', () => {
    expect(applyJoinGroupActivity(activity(), ORGANIZER, NOW)).toEqual({
      ok: false,
      reason: 'is-organizer',
    })
  })

  it('refuses joining once it has started', () => {
    const started = activity({ startAt: '2020-01-01T00:00:00.000Z' })
    expect(applyJoinGroupActivity(started, ALEX, NOW)).toEqual({ ok: false, reason: 'started' })
  })

  it('lets a participant leave, idempotently', () => {
    const joined = activity({ participantIds: [ALEX] })
    expect(applyLeaveGroupActivity(joined, ALEX)).toEqual({
      ok: true,
      unchanged: false,
      participantIds: [],
    })
    expect(applyLeaveGroupActivity(joined, BEN)).toEqual({
      ok: true,
      unchanged: true,
      participantIds: [ALEX],
    })
  })

  it('lets only the organizer remove a participant', () => {
    const joined = activity({ participantIds: [ALEX], maxParticipants: 2 })
    expect(applyRemoveParticipant(joined, ORGANIZER, ALEX)).toEqual({
      ok: true,
      unchanged: false,
      participantIds: [],
    })
    expect(applyRemoveParticipant(joined, BEN, ALEX)).toEqual({
      ok: false,
      reason: 'not-organizer',
    })
  })
})

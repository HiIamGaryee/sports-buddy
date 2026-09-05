import { describe, expect, it } from 'vitest'

import { MIN_SESSION_MINUTES, PERIOD_TIME_WINDOWS } from '@/constants/planning'
import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import {
  applyAcceptance,
  applyProposal,
  canPlanTogether,
  createEmptyPlan,
  getProposal,
  getProposalState,
  getSharedAvailabilitySlots,
  getSharedSportOptions,
  getSuggestedBudget,
  getTimeRangeError,
  getUpcomingDatesForAvailability,
  isAcceptStale,
  isPlanReady,
  isProposalAgreed,
  toDateKey,
} from '@/lib/planning'
import type { ActivityPlan, PlannedTime } from '@/types/planning'
import type { Connection } from '@/types/connection'

const GARY = 'gary'
const AINA = 'aina'
const PAIR = sortConnectionPair(GARY, AINA)
const AT = '2026-09-05T09:00:00.000Z'

const plan = (): ActivityPlan =>
  createEmptyPlan({
    id: `${createConnectionId(GARY, AINA)}__active`,
    connectionId: createConnectionId(GARY, AINA),
    participants: PAIR,
    createdBy: GARY,
    at: AT,
  })

const connection = (overrides: Partial<Connection> = {}): Connection => ({
  id: createConnectionId(GARY, AINA),
  participants: PAIR,
  requestedBy: PAIR,
  status: 'connected',
  createdAt: AT,
  updatedAt: AT,
  connectedAt: AT,
  ...overrides,
})

describe('canPlanTogether', () => {
  it('allows a connected pair from either side', () => {
    expect(canPlanTogether(connection(), GARY)).toBe(true)
    expect(canPlanTogether(connection(), AINA)).toBe(true)
  })

  it('refuses pending, missing and unrelated', () => {
    const pending = connection({ requestedBy: [GARY], status: 'pending' })
    expect(canPlanTogether(pending, GARY)).toBe(false)
    expect(canPlanTogether(pending, AINA)).toBe(false)
    expect(canPlanTogether(null, GARY)).toBe(false)
    expect(canPlanTogether(connection(), 'stranger')).toBe(false)
  })
})

describe('getSharedSportOptions', () => {
  it('returns only sports both people list, with both levels', () => {
    const options = getSharedSportOptions(
      [
        { sportId: 'badminton', skillLevel: 'intermediate' },
        { sportId: 'climbing', skillLevel: 'beginner' },
      ],
      [
        { sportId: 'badminton', skillLevel: 'advanced' },
        { sportId: 'running', skillLevel: 'casual' },
      ],
    )
    expect(options).toEqual([
      {
        sportId: 'badminton',
        mySkillLevel: 'intermediate',
        theirSkillLevel: 'advanced',
      },
    ])
  })

  it('returns nothing when there is no overlap', () => {
    expect(
      getSharedSportOptions(
        [{ sportId: 'badminton', skillLevel: 'casual' }],
        [{ sportId: 'futsal', skillLevel: 'casual' }],
      ),
    ).toEqual([])
  })
})

describe('shared availability', () => {
  it('keeps only day+period both marked', () => {
    const shared = getSharedAvailabilitySlots(
      [
        { day: 'saturday', periods: ['afternoon', 'evening'] },
        { day: 'sunday', periods: ['morning'] },
      ],
      [
        { day: 'saturday', periods: ['evening'] },
        { day: 'sunday', periods: ['afternoon'] },
      ],
    )
    expect(shared).toEqual([{ day: 'saturday', periods: ['evening'] }])
  })
})

describe('getUpcomingDatesForAvailability', () => {
  const shared = [{ day: 'saturday' as const, periods: ['evening' as const] }]
  // A Saturday, chosen locally so the test does not depend on the machine's
  // timezone the way `new Date('2026-09-05')` would.
  const from = new Date(2026, 8, 5)

  it('generates real upcoming dates, never hardcoded ones', () => {
    const dates = getUpcomingDatesForAvailability(shared, from)
    expect(dates).toHaveLength(3)
    for (const slot of dates) {
      // Saturday in the local calendar.
      expect(new Date(`${slot.date}T00:00:00`).getDay()).toBe(6)
      expect(slot.day).toBe('saturday')
      expect(slot.period).toBe('evening')
    }
  })

  it('never suggests a date before the day it starts from', () => {
    const dates = getUpcomingDatesForAvailability(shared, from)
    const today = toDateKey(from)
    expect(dates.every((slot) => slot.date >= today)).toBe(true)
  })

  it('is ordered and a week apart for a weekly slot', () => {
    const [first, second, third] = getUpcomingDatesForAvailability(shared, from)
    expect(first.date < second.date).toBe(true)
    expect(second.date < third.date).toBe(true)
  })

  it('seeds times from the period window', () => {
    const [first] = getUpcomingDatesForAvailability(shared, from)
    expect(first.startTime).toBe(PERIOD_TIME_WINDOWS.evening.startTime)
    expect(first.endTime > first.startTime).toBe(true)
  })

  it('returns nothing without a shared slot', () => {
    expect(getUpcomingDatesForAvailability([], from)).toEqual([])
  })
})

describe('getTimeRangeError', () => {
  const now = new Date(2026, 8, 5, 10, 0)
  const time = (overrides: Partial<PlannedTime> = {}): PlannedTime => ({
    date: '2026-09-12',
    startTime: '17:00',
    endTime: '19:00',
    timeZone: 'Asia/Kuala_Lumpur',
    ...overrides,
  })

  it('accepts a sensible future range', () => {
    expect(getTimeRangeError(time(), now)).toBeNull()
  })

  it('rejects a past date', () => {
    expect(getTimeRangeError(time({ date: '2026-09-01' }), now)).toMatch(
      /future/i,
    )
  })

  it('rejects a start time that has already passed today', () => {
    expect(
      getTimeRangeError(
        time({ date: '2026-09-05', startTime: '08:00', endTime: '10:00' }),
        now,
      ),
    ).toMatch(/already passed/i)
  })

  it('rejects an end at or before the start', () => {
    expect(getTimeRangeError(time({ endTime: '17:00' }), now)).toMatch(
      /after the start/i,
    )
    expect(getTimeRangeError(time({ endTime: '16:00' }), now)).toMatch(
      /after the start/i,
    )
  })

  it('rejects a session shorter than the minimum', () => {
    expect(getTimeRangeError(time({ endTime: '17:10' }), now)).toMatch(
      new RegExp(`${MIN_SESSION_MINUTES} minutes`),
    )
  })

  it('rejects empty or malformed values', () => {
    expect(getTimeRangeError(time({ date: '' }), now)).not.toBeNull()
    expect(getTimeRangeError(time({ startTime: '' }), now)).not.toBeNull()
  })
})

describe('getSuggestedBudget', () => {
  it('returns the overlapping range', () => {
    expect(
      getSuggestedBudget({ min: 20, max: 40 }, { min: 30, max: 60 }),
    ).toEqual({ min: 30, max: 40 })
  })

  it('returns null when the ranges do not meet', () => {
    expect(
      getSuggestedBudget({ min: 10, max: 20 }, { min: 40, max: 60 }),
    ).toBeNull()
  })

  it('handles an open-ended budget', () => {
    expect(
      getSuggestedBudget({ min: 20, max: 40 }, { min: 0, max: null }),
    ).toEqual({ min: 20, max: 40 })
    expect(
      getSuggestedBudget({ min: 60, max: null }, { min: 0, max: null }),
    ).toEqual({ min: 60, max: null })
  })

  it('returns null when a budget is missing', () => {
    expect(getSuggestedBudget(null, { min: 20, max: 40 })).toBeNull()
  })
})

describe('proposals', () => {
  it('starts empty, with nothing agreed', () => {
    const fresh = plan()
    expect(fresh.sportProposal.version).toBe(0)
    expect(isProposalAgreed(fresh.sportProposal, PAIR)).toBe(false)
    expect(fresh.status).toBe('draft')
  })

  it('accepts implicitly for the proposer', () => {
    const next = applyProposal(plan(), 'sport', 'badminton', GARY, AT)
    expect(next.sportProposal.value).toBe('badminton')
    expect(next.sportProposal.proposedBy).toBe(GARY)
    expect(next.sportProposal.acceptedBy).toEqual([GARY])
    expect(next.sportProposal.version).toBe(1)
    expect(isProposalAgreed(next.sportProposal, PAIR)).toBe(false)
  })

  it('is agreed once the other person accepts', () => {
    const proposed = applyProposal(plan(), 'sport', 'badminton', GARY, AT)
    const agreed = applyAcceptance(proposed, 'sport', AINA, AT)
    expect([...agreed.sportProposal.acceptedBy].sort()).toEqual(
      [...PAIR].sort(),
    )
    expect(isProposalAgreed(agreed.sportProposal, PAIR)).toBe(true)
  })

  it('is idempotent when the same value is proposed again', () => {
    const first = applyProposal(plan(), 'sport', 'badminton', GARY, AT)
    const accepted = applyAcceptance(first, 'sport', AINA, AT)
    const again = applyProposal(accepted, 'sport', 'badminton', GARY, AT)
    // A double tap must not knock out the other person's agreement.
    expect(again).toBe(accepted)
    expect(isProposalAgreed(again.sportProposal, PAIR)).toBe(true)
  })

  it('is idempotent when the same person accepts twice', () => {
    const proposed = applyProposal(plan(), 'sport', 'badminton', GARY, AT)
    const once = applyAcceptance(proposed, 'sport', AINA, AT)
    const twice = applyAcceptance(once, 'sport', AINA, AT)
    expect(twice).toBe(once)
    expect(twice.sportProposal.acceptedBy).toHaveLength(2)
  })

  it('resets the other person’s agreement when the value changes', () => {
    const agreed = applyAcceptance(
      applyProposal(plan(), 'sport', 'badminton', GARY, AT),
      'sport',
      AINA,
      AT,
    )
    const changed = applyProposal(agreed, 'sport', 'climbing', AINA, AT)

    expect(changed.sportProposal.value).toBe('climbing')
    expect(changed.sportProposal.acceptedBy).toEqual([AINA])
    expect(changed.sportProposal.version).toBe(2)
    expect(isProposalAgreed(changed.sportProposal, PAIR)).toBe(false)
  })

  it('detects a stale version', () => {
    const first = applyProposal(plan(), 'sport', 'badminton', GARY, AT)
    const second = applyProposal(first, 'sport', 'climbing', GARY, AT)

    expect(isAcceptStale(second, 'sport', 1)).toBe(true)
    expect(isAcceptStale(second, 'sport', 2)).toBe(false)
  })

  it('reports the viewer’s side of the collaboration', () => {
    const fresh = plan()
    expect(getProposalState(fresh.sportProposal, PAIR, GARY)).toBe('empty')

    const proposed = applyProposal(fresh, 'sport', 'badminton', GARY, AT)
    expect(getProposalState(proposed.sportProposal, PAIR, GARY)).toBe(
      'waiting-for-them',
    )
    expect(getProposalState(proposed.sportProposal, PAIR, AINA)).toBe(
      'needs-your-response',
    )

    const agreed = applyAcceptance(proposed, 'sport', AINA, AT)
    expect(getProposalState(agreed.sportProposal, PAIR, GARY)).toBe('agreed')
    expect(getProposalState(agreed.sportProposal, PAIR, AINA)).toBe('agreed')
  })

  it('keeps the untouched proposals alone', () => {
    const next = applyProposal(plan(), 'sport', 'badminton', GARY, AT)
    expect(getProposal(next, 'time').version).toBe(0)
    expect(getProposal(next, 'budget').version).toBe(0)
  })
})

describe('readiness', () => {
  const agreeAll = (kinds: readonly ('sport' | 'time' | 'budget')[]) => {
    const values = {
      sport: 'badminton',
      time: {
        date: '2026-09-12',
        startTime: '17:00',
        endTime: '19:00',
        timeZone: 'Asia/Kuala_Lumpur',
      },
      budget: { min: 20, max: 40 },
    } as const

    return kinds.reduce(
      (current, kind) =>
        applyAcceptance(
          applyProposal(current, kind, values[kind], GARY, AT),
          kind,
          AINA,
          AT,
        ),
      plan(),
    )
  }

  it('is not ready with only the sport agreed', () => {
    const next = agreeAll(['sport'])
    expect(isPlanReady(next)).toBe(false)
    expect(next.status).toBe('draft')
  })

  it('is not ready with sport and time agreed', () => {
    const next = agreeAll(['sport', 'time'])
    expect(isPlanReady(next)).toBe(false)
    expect(next.status).toBe('draft')
  })

  it('is ready only once all three are agreed by both', () => {
    const next = agreeAll(['sport', 'time', 'budget'])
    expect(isPlanReady(next)).toBe(true)
    expect(next.status).toBe('ready')
  })

  it('is not ready when a value is merely filled in by one person', () => {
    const proposed = ['sport', 'time', 'budget'].reduce<ActivityPlan>(
      (current, kind) =>
        applyProposal(
          current,
          kind as 'sport' | 'time' | 'budget',
          kind === 'sport'
            ? 'badminton'
            : kind === 'time'
              ? {
                  date: '2026-09-12',
                  startTime: '17:00',
                  endTime: '19:00',
                  timeZone: 'Asia/Kuala_Lumpur',
                }
              : { min: 20, max: 40 },
          GARY,
          AT,
        ),
      plan(),
    )
    expect(isPlanReady(proposed)).toBe(false)
    expect(proposed.status).toBe('draft')
  })

  it('drops back to draft if an agreed value is replaced', () => {
    const ready = agreeAll(['sport', 'time', 'budget'])
    const changed = applyProposal(ready, 'sport', 'climbing', GARY, AT)
    expect(changed.status).toBe('draft')
    expect(isPlanReady(changed)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import {
  activityIdForPlan,
  buildActivityFromPlan,
  canConfirmActivity,
  compareByStart,
  isPlanLocked,
  resolvePlannedInstant,
} from '@/lib/activity'
import {
  formatDateBlock,
  formatDuration,
} from '@/lib/activity-format'
import { applyAcceptance, applyProposal, createEmptyPlan } from '@/lib/planning'
import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import type { ActivityPlan, ProposalKind } from '@/types/planning'

const GARY = 'gary'
const AINA = 'aina'
const PAIR = sortConnectionPair(GARY, AINA)
const CONNECTION_ID = createConnectionId(GARY, AINA)
const PLAN_ID = `${CONNECTION_ID}__active`
const AT = '2026-09-05T09:00:00.000Z'

const VENUE = {
  placeId: 'mock_pj_racquet_club',
  name: 'Petaling Jaya Racquet Club',
  address: 'Jalan 13/6, Seksyen 13, Petaling Jaya',
  location: { lat: 3.1096, lng: 101.6371 },
  googleMapsUri: 'https://maps.google.com/?cid=1',
}
const TIME = {
  date: '2030-01-05',
  startTime: '17:00',
  endTime: '19:00',
  timeZone: 'Asia/Kuala_Lumpur',
}
const BUDGET = { min: 20, max: 40 }

const VALUES = { sport: 'badminton', time: TIME, budget: BUDGET, venue: VENUE } as const

const emptyPlan = (): ActivityPlan =>
  createEmptyPlan({
    id: PLAN_ID,
    connectionId: CONNECTION_ID,
    participants: PAIR,
    createdBy: GARY,
    at: AT,
  })

/** Agrees the named parts, by both people. */
function planWith(kinds: readonly ProposalKind[]): ActivityPlan {
  return kinds.reduce(
    (plan, kind) =>
      applyAcceptance(
        applyProposal(plan, kind, VALUES[kind], GARY, AT),
        kind,
        AINA,
        AT,
      ),
    emptyPlan(),
  )
}

const fullyAgreed = () => planWith(['sport', 'time', 'budget', 'venue'])

describe('canConfirmActivity', () => {
  it('accepts a plan with all four agreed by both', () => {
    const plan = fullyAgreed()
    expect(plan.status).toBe('venue-agreed')
    expect(canConfirmActivity(plan)).toBe(true)
  })

  it('rejects a draft', () => {
    expect(canConfirmActivity(emptyPlan())).toBe(false)
  })

  it('rejects each partial combination', () => {
    expect(canConfirmActivity(planWith(['time', 'budget', 'venue']))).toBe(false)
    expect(canConfirmActivity(planWith(['sport', 'budget', 'venue']))).toBe(false)
    expect(canConfirmActivity(planWith(['sport', 'time', 'venue']))).toBe(false)
    expect(canConfirmActivity(planWith(['sport', 'time', 'budget']))).toBe(false)
  })

  it('rejects a part only one person has accepted', () => {
    const onlyGary = applyProposal(
      planWith(['sport', 'time', 'budget']),
      'venue',
      VENUE,
      GARY,
      AT,
    )
    expect(onlyGary.venueProposal.acceptedBy).toEqual([GARY])
    expect(canConfirmActivity(onlyGary)).toBe(false)
  })

  it('rejects an already confirmed plan, so a second activity is impossible', () => {
    const confirmed = { ...fullyAgreed(), status: 'confirmed' as const }
    expect(canConfirmActivity(confirmed)).toBe(false)
    expect(isPlanLocked(confirmed)).toBe(true)
  })

  it('rejects nothing at all', () => {
    expect(canConfirmActivity(null)).toBe(false)
    expect(canConfirmActivity(undefined)).toBe(false)
  })
})

describe('activityIdForPlan', () => {
  it('is the plan id, so one plan makes at most one activity', () => {
    expect(activityIdForPlan(PLAN_ID)).toBe(PLAN_ID)
    expect(activityIdForPlan(PLAN_ID)).toBe(activityIdForPlan(PLAN_ID))
  })
})

describe('resolvePlannedInstant', () => {
  it('resolves a wall time in its own zone, not the device zone', () => {
    // 17:00 in Asia/Kuala_Lumpur (UTC+8) is 09:00 UTC.
    const instant = resolvePlannedInstant(TIME)
    expect(instant?.toISOString()).toBe('2030-01-05T09:00:00.000Z')
  })

  it('gives the same instant whatever zone name is used, when equivalent', () => {
    const utc = resolvePlannedInstant({ ...TIME, timeZone: 'UTC' })
    expect(utc?.toISOString()).toBe('2030-01-05T17:00:00.000Z')
  })

  it('returns null for a malformed time', () => {
    expect(resolvePlannedInstant({ ...TIME, date: '' })).toBeNull()
    expect(resolvePlannedInstant({ ...TIME, startTime: 'nope' })).toBeNull()
  })
})

describe('buildActivityFromPlan', () => {
  it('snapshots exactly what was agreed', () => {
    const input = buildActivityFromPlan(fullyAgreed(), GARY)

    expect(input).not.toBeNull()
    expect(input?.id).toBe(PLAN_ID)
    expect(input?.sourcePlanId).toBe(PLAN_ID)
    expect(input?.connectionId).toBe(CONNECTION_ID)
    expect(input?.participants).toEqual(PAIR)
    expect(input?.sportId).toBe('badminton')
    expect(input?.venue).toEqual(VENUE)
    expect(input?.budget).toEqual({
      min: 20,
      max: 40,
      currency: 'MYR',
      unit: 'per-person',
    })
    expect(input?.createdBy).toBe(GARY)
  })

  it('turns the agreed local time into real instants', () => {
    const input = buildActivityFromPlan(fullyAgreed(), GARY)
    expect(input?.startAt).toBe('2030-01-05T09:00:00.000Z')
    expect(input?.endAt).toBe('2030-01-05T11:00:00.000Z')
    expect(new Date(input!.endAt) > new Date(input!.startAt)).toBe(true)
  })

  it('copies no planning history, acceptance or profile data', () => {
    const serialized = JSON.stringify(buildActivityFromPlan(fullyAgreed(), GARY))
    for (const leak of [
      'acceptedBy',
      'proposedBy',
      'version',
      'sportProposal',
      'displayName',
      'email',
    ]) {
      expect(serialized).not.toContain(leak)
    }
  })

  it('refuses a plan that is not confirmable', () => {
    expect(buildActivityFromPlan(emptyPlan(), GARY)).toBeNull()
    expect(
      buildActivityFromPlan(planWith(['sport', 'time', 'budget']), GARY),
    ).toBeNull()
  })

  it('refuses an end time at or before the start', () => {
    const plan = planWith(['sport', 'budget', 'venue'])
    const bad = applyAcceptance(
      applyProposal(plan, 'time', { ...TIME, endTime: '17:00' }, GARY, AT),
      'time',
      AINA,
      AT,
    )
    expect(buildActivityFromPlan(bad, GARY)).toBeNull()
  })

  it('refuses a venue with impossible coordinates', () => {
    const plan = planWith(['sport', 'time', 'budget'])
    const bad = applyAcceptance(
      applyProposal(
        plan,
        'venue',
        { ...VENUE, location: { lat: 999, lng: 0 } },
        GARY,
        AT,
      ),
      'venue',
      AINA,
      AT,
    )
    expect(buildActivityFromPlan(bad, GARY)).toBeNull()
  })
})

describe('sorting and formatting', () => {
  it('orders by start time, soonest first', () => {
    const sorted = [
      { startAt: '2030-03-01T09:00:00.000Z' },
      { startAt: '2030-01-05T09:00:00.000Z' },
      { startAt: '2030-02-01T09:00:00.000Z' },
    ].sort(compareByStart)

    expect(sorted.map((entry) => entry.startAt.slice(5, 7))).toEqual([
      '01',
      '02',
      '03',
    ])
  })

  it('formats a duration without duplicating the maths', () => {
    expect(
      formatDuration('2030-01-05T09:00:00.000Z', '2030-01-05T11:00:00.000Z'),
    ).toBe('2 hr')
    expect(
      formatDuration('2030-01-05T09:00:00.000Z', '2030-01-05T10:30:00.000Z'),
    ).toBe('1 hr 30 min')
    expect(
      formatDuration('2030-01-05T09:00:00.000Z', '2030-01-05T09:45:00.000Z'),
    ).toBe('45 min')
    expect(
      formatDuration('2030-01-05T09:00:00.000Z', '2030-01-05T09:00:00.000Z'),
    ).toBe('')
  })

  it('builds a date block from real month names', () => {
    const block = formatDateBlock('2030-01-05T09:00:00.000Z')
    expect(block.month).toMatch(/^[A-Z]{3,4}$/)
    expect(Number(block.day)).toBeGreaterThan(0)
  })
})

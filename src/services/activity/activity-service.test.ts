import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import { activityService } from '@/services/activity/activity-service'
import { activityPlanService } from '@/services/planning/activity-plan-service'
import type { Connection } from '@/types/connection'

/**
 * The activity domain end to end through the mock repositories — the same
 * ones the app uses with `VITE_DATA_SOURCE=mock`, so these cover the service
 * rules, the plan→activity conversion and mock persistence in one pass.
 */
const GARY = 'gary'
const AINA = 'aina'
const STRANGER = 'stranger'
const PAIR = sortConnectionPair(GARY, AINA)
const CONNECTION_ID = createConnectionId(GARY, AINA)
const PLAN_ID = `${CONNECTION_ID}__active`

const storage = new Map<string, string>()

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  })
})

beforeEach(() => storage.clear())

const connection = (overrides: Partial<Connection> = {}): Connection => ({
  id: CONNECTION_ID,
  participants: PAIR,
  requestedBy: PAIR,
  status: 'connected',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  connectedAt: '2026-09-01T09:00:00.000Z',
  ...overrides,
})

const VENUE = {
  placeId: 'mock_pj_racquet_club',
  name: 'Petaling Jaya Racquet Club',
  address: 'Jalan 13/6, Seksyen 13, Petaling Jaya',
  location: { lat: 3.1096, lng: 101.6371 },
  googleMapsUri: 'https://maps.google.com/?cid=1',
}
const TIME = { date: '2030-01-05', startTime: '17:00', endTime: '19:00' }
const BUDGET = { min: 20, max: 40 }
const SHARED_SPORTS = ['badminton', 'climbing'] as const

/** Drives a plan all the way to `venue-agreed` through the real service. */
async function makeVenueAgreedPlan() {
  await activityPlanService.openPlan(connection(), GARY)

  const sport = await activityPlanService.proposeSport(
    connection(),
    GARY,
    'badminton',
    SHARED_SPORTS,
  )
  await activityPlanService.accept(
    connection(),
    AINA,
    'sport',
    sport.sportProposal.version,
  )

  const time = await activityPlanService.proposeTime(connection(), GARY, TIME)
  await activityPlanService.accept(
    connection(),
    AINA,
    'time',
    time.timeProposal.version,
  )

  const budget = await activityPlanService.proposeBudget(
    connection(),
    GARY,
    BUDGET,
  )
  await activityPlanService.accept(
    connection(),
    AINA,
    'budget',
    budget.budgetProposal.version,
  )

  const venue = await activityPlanService.proposeVenue(
    connection(),
    GARY,
    VENUE,
    true,
  )
  return activityPlanService.accept(
    connection(),
    AINA,
    'venue',
    venue.venueProposal.version,
  )
}

/** What a fresh app load would see for the plan. */
function loadPlan() {
  let loaded = null
  const unsubscribe = activityPlanService.subscribe(
    CONNECTION_ID,
    (plan) => {
      loaded = plan
    },
    () => {},
  )
  unsubscribe()
  return loaded as import('@/types/planning').ActivityPlan | null
}

describe('confirming', () => {
  it('refuses a plan that is not fully agreed', async () => {
    await activityPlanService.openPlan(connection(), GARY)
    const plan = loadPlan()

    await expect(activityService.confirm(plan, GARY)).rejects.toThrow(
      /agree the sport, time, budget and venue/i,
    )
    expect(await activityService.getUpcoming(GARY)).toEqual([])
  })

  it('refuses somebody outside the plan', async () => {
    const plan = await makeVenueAgreedPlan()
    await expect(activityService.confirm(plan, STRANGER)).rejects.toThrow(
      /part of/i,
    )
    expect(await activityService.getUpcoming(STRANGER)).toEqual([])
  })

  it('refuses when there is no plan', async () => {
    await expect(activityService.confirm(null, GARY)).rejects.toThrow(
      /unavailable/i,
    )
  })

  it('creates one activity at the source plan id', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)

    expect(activity.id).toBe(PLAN_ID)
    expect(activity.sourcePlanId).toBe(PLAN_ID)
    expect(activity.connectionId).toBe(CONNECTION_ID)
    expect(activity.participants).toEqual(PAIR)
    expect(activity.status).toBe('upcoming')
    expect(activity.createdBy).toBe(GARY)
  })

  it('snapshots the agreed sport, time, budget and venue', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)

    expect(activity.sportId).toBe('badminton')
    expect(activity.startAt).toBe('2030-01-05T09:00:00.000Z')
    expect(activity.endAt).toBe('2030-01-05T11:00:00.000Z')
    expect(activity.budget).toEqual({
      min: 20,
      max: 40,
      currency: 'MYR',
      unit: 'per-person',
    })
    expect(activity.venue).toEqual(VENUE)
  })

  it('marks the plan confirmed and read-only', async () => {
    const plan = await makeVenueAgreedPlan()
    await activityService.confirm(plan, GARY)

    const after = loadPlan()
    expect(after?.status).toBe('confirmed')
    expect(activityService.canConfirm(after)).toBe(false)
  })

  it('is idempotent — a second confirm returns the same activity', async () => {
    const plan = await makeVenueAgreedPlan()
    const first = await activityService.confirm(plan, GARY)
    // The plan the caller holds is stale; the id still resolves the same doc.
    const second = await activityService.confirm(plan, GARY)

    expect(second).toEqual(first)
    expect(await activityService.getUpcoming(GARY)).toHaveLength(1)
  })

  it('creates ONE activity when both people confirm at once', async () => {
    const plan = await makeVenueAgreedPlan()

    const [fromGary, fromAina] = await Promise.all([
      activityService.confirm(plan, GARY),
      activityService.confirm(plan, AINA),
    ])

    expect(fromGary.id).toBe(fromAina.id)
    expect(await activityService.getUpcoming(GARY)).toHaveLength(1)
    expect(await activityService.getUpcoming(AINA)).toHaveLength(1)
  })

  it('stores no profile data on the activity', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)
    const serialized = JSON.stringify(activity)

    for (const leak of ['email', 'displayName', 'photoUrl', 'bio', 'acceptedBy']) {
      expect(serialized).not.toContain(leak)
    }
  })
})

describe('reading activities', () => {
  it('shows the activity to both participants', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)

    expect(
      await activityService.getForParticipant(activity.id, GARY),
    ).not.toBeNull()
    expect(
      await activityService.getForParticipant(activity.id, AINA),
    ).not.toBeNull()
  })

  it('hides it from everybody else, without saying it exists', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)

    // Identical to a genuinely missing activity — no existence leak.
    expect(await activityService.getForParticipant(activity.id, STRANGER)).toBeNull()
    expect(await activityService.getForParticipant('no-such-id', GARY)).toBeNull()
  })

  it('survives a reload', async () => {
    const plan = await makeVenueAgreedPlan()
    await activityService.confirm(plan, GARY)

    // A fresh read is exactly what a refresh does.
    const upcoming = await activityService.getUpcoming(GARY)
    expect(upcoming).toHaveLength(1)
    expect(upcoming[0].venue.name).toBe(VENUE.name)
  })

  it('orders upcoming activities soonest first', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)

    // A second, earlier activity written straight into the mock store.
    const key = 'sports-buddy.mock-activities'
    const store = JSON.parse(storage.get(key) ?? '{"activities":[]}')
    store.activities.push({
      ...activity,
      id: 'earlier__active',
      sourcePlanId: 'earlier__active',
      startAt: '2029-01-01T09:00:00.000Z',
      endAt: '2029-01-01T11:00:00.000Z',
    })
    storage.set(key, JSON.stringify(store))

    const upcoming = await activityService.getUpcoming(GARY)
    expect(upcoming.map((entry) => entry.id)).toEqual([
      'earlier__active',
      PLAN_ID,
    ])
  })

  it('resolves the other participant with the shared helper', async () => {
    const plan = await makeVenueAgreedPlan()
    const activity = await activityService.confirm(plan, GARY)

    expect(activityService.getBuddyId(activity, GARY)).toBe(AINA)
    expect(activityService.getBuddyId(activity, AINA)).toBe(GARY)
    expect(activityService.getBuddyId(activity, STRANGER)).toBeNull()
  })
})

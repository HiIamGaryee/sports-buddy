import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import { isPlanReady, isProposalAgreed } from '@/lib/planning'
import { activityPlanService } from '@/services/planning/activity-plan-service'
import type { ActivityPlan, PlannedTime } from '@/types/planning'
import type { Connection } from '@/types/connection'

/**
 * The planning domain end to end through the mock repository — the same one
 * the app uses with `VITE_DATA_SOURCE=mock`, so these cover the service
 * rules, collaborative behaviour and mock persistence in one pass.
 */
const GARY = 'gary'
const AINA = 'aina'
const STRANGER = 'stranger'
const PAIR = sortConnectionPair(GARY, AINA)
const CONNECTION_ID = createConnectionId(GARY, AINA)

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

const pending = () =>
  connection({ requestedBy: [GARY], status: 'pending', connectedAt: null })

const SHARED_SPORTS = ['badminton', 'climbing'] as const

/** A far-future slot, so the tests never rot. */
const futureTime = (): Omit<PlannedTime, 'timeZone'> => ({
  date: '2030-01-05',
  startTime: '17:00',
  endTime: '19:00',
})

/** What a fresh app load would see — the mock store is the only source. */
function loadPlan(): ActivityPlan | null {
  let loaded: ActivityPlan | null = null
  const unsubscribe = activityPlanService.subscribe(
    CONNECTION_ID,
    (plan) => {
      loaded = plan
    },
    () => {},
  )
  unsubscribe()
  return loaded
}

describe('plan access', () => {
  it('lets a connected pair plan, from either side', () => {
    expect(activityPlanService.canPlan(connection(), GARY)).toBe(true)
    expect(activityPlanService.canPlan(connection(), AINA)).toBe(true)
  })

  it('refuses a pending connection in either direction', async () => {
    await expect(
      activityPlanService.openPlan(pending(), GARY),
    ).rejects.toThrow(/connected/i)
    await expect(
      activityPlanService.openPlan(pending(), AINA),
    ).rejects.toThrow(/connected/i)
    expect(loadPlan()).toBeNull()
  })

  it('refuses somebody outside the connection', async () => {
    await expect(
      activityPlanService.openPlan(connection(), STRANGER),
    ).rejects.toThrow(/connected/i)
    expect(loadPlan()).toBeNull()
  })

  it('refuses when there is no connection at all', async () => {
    await expect(activityPlanService.openPlan(null, GARY)).rejects.toThrow(
      /connected/i,
    )
    expect(loadPlan()).toBeNull()
  })
})

describe('openPlan', () => {
  it('creates a draft carrying the connection identity', async () => {
    const plan = await activityPlanService.openPlan(connection(), GARY)
    expect(plan.connectionId).toBe(CONNECTION_ID)
    expect(plan.participants).toEqual(PAIR)
    expect(plan.status).toBe('draft')
    expect(plan.createdBy).toBe(GARY)
    expect(plan.id).not.toBe(CONNECTION_ID)
  })

  it('resumes rather than creating a second active draft', async () => {
    const first = await activityPlanService.openPlan(connection(), GARY)
    // Both people tapping "Plan a session" must share one draft.
    const second = await activityPlanService.openPlan(connection(), AINA)
    const third = await activityPlanService.openPlan(connection(), GARY)

    expect(second.id).toBe(first.id)
    expect(third).toEqual(first)
    expect(second.createdBy).toBe(GARY)
  })

  it('keeps progress when reopened', async () => {
    await activityPlanService.openPlan(connection(), GARY)
    await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )

    const reopened = await activityPlanService.openPlan(connection(), AINA)
    expect(reopened.sportProposal.value).toBe('badminton')
  })
})

describe('sport', () => {
  beforeEach(async () => {
    await activityPlanService.openPlan(connection(), GARY)
  })

  it('only accepts a sport both people play', async () => {
    await expect(
      activityPlanService.proposeSport(connection(), GARY, 'futsal', SHARED_SPORTS),
    ).rejects.toThrow(/both play/i)
    expect(loadPlan()?.sportProposal.version).toBe(0)
  })

  it('records the proposal and accepts it for the proposer', async () => {
    const plan = await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )
    expect(plan.sportProposal.acceptedBy).toEqual([GARY])
    expect(isProposalAgreed(plan.sportProposal, PAIR)).toBe(false)
  })

  it('is agreed once the other person accepts', async () => {
    const proposed = await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )
    const agreed = await activityPlanService.accept(
      connection(),
      AINA,
      'sport',
      proposed.sportProposal.version,
    )
    expect(isProposalAgreed(agreed.sportProposal, PAIR)).toBe(true)
  })

  it('rejects an acceptance aimed at a version that has been replaced', async () => {
    const first = await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )
    await activityPlanService.proposeSport(
      connection(),
      GARY,
      'climbing',
      SHARED_SPORTS,
    )

    // Aina is still looking at the badminton screen.
    await expect(
      activityPlanService.accept(
        connection(),
        AINA,
        'sport',
        first.sportProposal.version,
      ),
    ).rejects.toThrow(/changed/i)
    expect(loadPlan()?.sportProposal.value).toBe('climbing')
    expect(loadPlan()?.sportProposal.acceptedBy).toEqual([GARY])
  })

  it('cannot be accepted by somebody outside the connection', async () => {
    const proposed = await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )
    await expect(
      activityPlanService.accept(
        connection(),
        STRANGER,
        'sport',
        proposed.sportProposal.version,
      ),
    ).rejects.toThrow(/connected/i)
    expect(loadPlan()?.sportProposal.acceptedBy).toEqual([GARY])
  })
})

describe('time', () => {
  beforeEach(async () => {
    await activityPlanService.openPlan(connection(), GARY)
  })

  it('stores a real future slot with a timezone', async () => {
    const plan = await activityPlanService.proposeTime(
      connection(),
      GARY,
      futureTime(),
    )
    expect(plan.timeProposal.value?.date).toBe('2030-01-05')
    expect(plan.timeProposal.value?.timeZone).toBeTruthy()
  })

  it('rejects a past date and a reversed range', async () => {
    await expect(
      activityPlanService.proposeTime(connection(), GARY, {
        ...futureTime(),
        date: '2020-01-01',
      }),
    ).rejects.toThrow(/future/i)
    await expect(
      activityPlanService.proposeTime(connection(), GARY, {
        ...futureTime(),
        endTime: '16:00',
      }),
    ).rejects.toThrow(/after the start/i)
    expect(loadPlan()?.timeProposal.version).toBe(0)
  })

  it('agrees, and resets when either person suggests another time', async () => {
    const proposed = await activityPlanService.proposeTime(
      connection(),
      GARY,
      futureTime(),
    )
    const agreed = await activityPlanService.accept(
      connection(),
      AINA,
      'time',
      proposed.timeProposal.version,
    )
    expect(isProposalAgreed(agreed.timeProposal, PAIR)).toBe(true)

    const changed = await activityPlanService.proposeTime(connection(), AINA, {
      ...futureTime(),
      startTime: '18:00',
      endTime: '20:00',
    })
    expect(changed.timeProposal.acceptedBy).toEqual([AINA])
    expect(isProposalAgreed(changed.timeProposal, PAIR)).toBe(false)
  })
})

describe('budget', () => {
  beforeEach(async () => {
    await activityPlanService.openPlan(connection(), GARY)
  })

  it('stores a session budget and agrees', async () => {
    const proposed = await activityPlanService.proposeBudget(
      connection(),
      GARY,
      { min: 20, max: 40 },
    )
    const agreed = await activityPlanService.accept(
      connection(),
      AINA,
      'budget',
      proposed.budgetProposal.version,
    )
    expect(agreed.budgetProposal.value).toEqual({ min: 20, max: 40 })
    expect(isProposalAgreed(agreed.budgetProposal, PAIR)).toBe(true)
  })

  it('accepts an open-ended budget', async () => {
    const plan = await activityPlanService.proposeBudget(connection(), GARY, {
      min: 60,
      max: null,
    })
    expect(plan.budgetProposal.value).toEqual({ min: 60, max: null })
  })

  it('rejects a reversed range', async () => {
    await expect(
      activityPlanService.proposeBudget(connection(), GARY, {
        min: 40,
        max: 10,
      }),
    ).rejects.toThrow(/at least the bottom/i)
  })
})

describe('readiness', () => {
  async function agree(kind: 'sport' | 'time' | 'budget') {
    const proposed =
      kind === 'sport'
        ? await activityPlanService.proposeSport(
            connection(),
            GARY,
            'badminton',
            SHARED_SPORTS,
          )
        : kind === 'time'
          ? await activityPlanService.proposeTime(
              connection(),
              GARY,
              futureTime(),
            )
          : await activityPlanService.proposeBudget(connection(), GARY, {
              min: 20,
              max: 40,
            })

    const proposal =
      kind === 'sport'
        ? proposed.sportProposal
        : kind === 'time'
          ? proposed.timeProposal
          : proposed.budgetProposal

    return activityPlanService.accept(
      connection(),
      AINA,
      kind,
      proposal.version,
    )
  }

  beforeEach(async () => {
    await activityPlanService.openPlan(connection(), GARY)
  })

  it('stays a draft until all three are agreed', async () => {
    expect((await agree('sport')).status).toBe('draft')
    expect((await agree('time')).status).toBe('draft')

    const ready = await agree('budget')
    expect(ready.status).toBe('ready')
    expect(isPlanReady(ready)).toBe(true)
  })

  it('reaches `ready` with the venue still open', async () => {
    await agree('sport')
    await agree('time')
    const ready = await agree('budget')
    // `ready` means "ready for a venue" — the venue proposal exists but is
    // untouched, and the status only moves on once it is agreed too.
    expect(ready.status).toBe('ready')
    expect(ready.venueProposal.version).toBe(0)
    expect(ready.venueProposal.value).toBeNull()
  })

  it('falls back to draft when an agreed value is replaced', async () => {
    await agree('sport')
    await agree('time')
    await agree('budget')

    const changed = await activityPlanService.proposeSport(
      connection(),
      AINA,
      'climbing',
      SHARED_SPORTS,
    )
    expect(changed.status).toBe('draft')
  })
})

describe('venue', () => {
  const VENUE = {
    placeId: 'mock_pj_racquet_club',
    name: 'Petaling Jaya Racquet Club',
    address: 'Jalan 13/6, Seksyen 13, Petaling Jaya',
    location: { lat: 3.1096, lng: 101.6371 },
    openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.1&mlon=101.6#map=17/3.1/101.6',
  }
  const OTHER_VENUE = {
    ...VENUE,
    placeId: 'mock_usj_sports_arena',
    name: 'USJ Sports Arena',
    location: { lat: 3.0421, lng: 101.5836 },
  }

  /** Gets the plan to `ready`: sport, time and budget agreed by both. */
  async function makeReady() {
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
    const time = await activityPlanService.proposeTime(
      connection(),
      GARY,
      futureTime(),
    )
    await activityPlanService.accept(
      connection(),
      AINA,
      'time',
      time.timeProposal.version,
    )
    const budget = await activityPlanService.proposeBudget(connection(), GARY, {
      min: 20,
      max: 40,
    })
    return activityPlanService.accept(
      connection(),
      AINA,
      'budget',
      budget.budgetProposal.version,
    )
  }

  it('cannot be proposed before sport, time and budget are agreed', async () => {
    await activityPlanService.openPlan(connection(), GARY)
    await expect(
      activityPlanService.proposeVenue(connection(), GARY, VENUE, false),
    ).rejects.toThrow(/sport, time and budget/i)
    expect(loadPlan()?.venueProposal.version).toBe(0)
  })

  it('is accepted implicitly by whoever proposes it', async () => {
    await makeReady()
    const plan = await activityPlanService.proposeVenue(
      connection(),
      GARY,
      VENUE,
      true,
    )
    expect(plan.venueProposal.value?.placeId).toBe(VENUE.placeId)
    expect(plan.venueProposal.acceptedBy).toEqual([GARY])
    expect(plan.status).toBe('ready')
  })

  it('reaches venue-agreed once the other person agrees', async () => {
    await makeReady()
    const proposed = await activityPlanService.proposeVenue(
      connection(),
      GARY,
      VENUE,
      true,
    )
    const agreed = await activityPlanService.accept(
      connection(),
      AINA,
      'venue',
      proposed.venueProposal.version,
    )
    expect(isProposalAgreed(agreed.venueProposal, PAIR)).toBe(true)
    expect(agreed.status).toBe('venue-agreed')
  })

  it('is idempotent when the same person agrees twice', async () => {
    await makeReady()
    const proposed = await activityPlanService.proposeVenue(
      connection(),
      GARY,
      VENUE,
      true,
    )
    const once = await activityPlanService.accept(
      connection(),
      AINA,
      'venue',
      proposed.venueProposal.version,
    )
    const twice = await activityPlanService.accept(
      connection(),
      AINA,
      'venue',
      once.venueProposal.version,
    )
    expect(twice.venueProposal.acceptedBy).toHaveLength(2)
    expect(twice.status).toBe('venue-agreed')
  })

  it('resets agreement and drops back to ready when the venue changes', async () => {
    await makeReady()
    const proposed = await activityPlanService.proposeVenue(
      connection(),
      GARY,
      VENUE,
      true,
    )
    await activityPlanService.accept(
      connection(),
      AINA,
      'venue',
      proposed.venueProposal.version,
    )

    const changed = await activityPlanService.proposeVenue(
      connection(),
      AINA,
      OTHER_VENUE,
      true,
    )
    expect(changed.venueProposal.value?.placeId).toBe(OTHER_VENUE.placeId)
    expect(changed.venueProposal.acceptedBy).toEqual([AINA])
    expect(changed.status).toBe('ready')
  })

  it('rejects an agreement aimed at a replaced venue', async () => {
    await makeReady()
    const first = await activityPlanService.proposeVenue(
      connection(),
      GARY,
      VENUE,
      true,
    )
    await activityPlanService.proposeVenue(connection(), GARY, OTHER_VENUE, true)

    await expect(
      activityPlanService.accept(
        connection(),
        AINA,
        'venue',
        first.venueProposal.version,
      ),
    ).rejects.toThrow(/changed/i)
    expect(loadPlan()?.venueProposal.value?.placeId).toBe(OTHER_VENUE.placeId)
  })

  it('rejects a snapshot with impossible coordinates', async () => {
    await makeReady()
    await expect(
      activityPlanService.proposeVenue(
        connection(),
        GARY,
        { ...VENUE, location: { lat: 999, lng: 0 } },
        true,
      ),
    ).rejects.toThrow(/details look wrong/i)
    expect(loadPlan()?.venueProposal.version).toBe(0)
  })

  it('cannot be proposed by a pending or unrelated user', async () => {
    await makeReady()
    await expect(
      activityPlanService.proposeVenue(pending(), GARY, VENUE, true),
    ).rejects.toThrow(/connected/i)
    await expect(
      activityPlanService.proposeVenue(connection(), STRANGER, VENUE, true),
    ).rejects.toThrow(/connected/i)
    expect(loadPlan()?.venueProposal.version).toBe(0)
  })

  it('persists the snapshot across a reload, with no provider extras', async () => {
    await makeReady()
    const proposed = await activityPlanService.proposeVenue(
      connection(),
      GARY,
      VENUE,
      true,
    )
    await activityPlanService.accept(
      connection(),
      AINA,
      'venue',
      proposed.venueProposal.version,
    )

    const reloaded = loadPlan()
    expect(reloaded?.status).toBe('venue-agreed')
    expect(reloaded?.venueProposal.value).toEqual(VENUE)

    const serialized = JSON.stringify(reloaded?.venueProposal.value)
    for (const provider of ['rating', 'priceLevel', 'primaryType', 'photos']) {
      expect(serialized).not.toContain(provider)
    }
  })
})

describe('collaboration and persistence', () => {
  it('delivers another participant’s change to an open subscription', async () => {
    await activityPlanService.openPlan(connection(), GARY)

    const seen: (ActivityPlan | null)[] = []
    const unsubscribe = activityPlanService.subscribe(
      CONNECTION_ID,
      (plan) => seen.push(plan),
      () => {},
    )

    await activityPlanService.proposeSport(
      connection(),
      AINA,
      'badminton',
      SHARED_SPORTS,
    )
    unsubscribe()

    expect(seen.length).toBeGreaterThan(1)
    expect(seen.at(-1)?.sportProposal.value).toBe('badminton')
    expect(seen.at(-1)?.sportProposal.proposedBy).toBe(AINA)
  })

  it('stops delivering after unsubscribe', async () => {
    await activityPlanService.openPlan(connection(), GARY)
    const seen: (ActivityPlan | null)[] = []
    const unsubscribe = activityPlanService.subscribe(
      CONNECTION_ID,
      (plan) => seen.push(plan),
      () => {},
    )
    unsubscribe()
    await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )
    expect(seen).toHaveLength(1)
  })

  it('survives a reload', async () => {
    await activityPlanService.openPlan(connection(), GARY)
    const proposed = await activityPlanService.proposeSport(
      connection(),
      GARY,
      'badminton',
      SHARED_SPORTS,
    )
    await activityPlanService.accept(
      connection(),
      AINA,
      'sport',
      proposed.sportProposal.version,
    )

    // A fresh read is exactly what a refresh does.
    const reloaded = loadPlan()
    expect(reloaded?.sportProposal.value).toBe('badminton')
    expect(isProposalAgreed(reloaded!.sportProposal, PAIR)).toBe(true)
  })

  it('stores no profile data on the plan', async () => {
    const plan = await activityPlanService.openPlan(connection(), GARY)
    const serialized = JSON.stringify(plan)
    for (const leak of ['email', 'displayName', 'photoUrl', 'bio', 'area']) {
      expect(serialized).not.toContain(leak)
    }
  })
})

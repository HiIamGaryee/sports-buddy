import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import type { Activity } from '@/types/activity'
import type { SportId } from '@/types/sports-profile'
import type { VenueSelection } from '@/types/venue'

/**
 * Development activity history for `VITE_DATA_SOURCE=mock`, seeded per mock
 * account against the connected buddies in `mock-connection-repository.ts`.
 *
 * Dates are RELATIVE to the moment the store is first seeded, never fixed
 * calendar dates. A fixture pinned to `2026-01-01` is upcoming for a week and
 * then permanently past, which makes the Upcoming tab impossible to develop
 * against a month later. Offsets keep both tabs populated forever.
 *
 * The spread is deliberate: one session in progress right now (so "Happening
 * now" is reachable), one soon, one further out, and enough history across
 * two months that month grouping and "Load more" are both visible.
 */
interface ActivitySeed {
  buddyId: string
  sportId: SportId
  /** Days from seeding. Negative is history. */
  dayOffset: number
  /**
   * Local start hour, 24h — or `'now'` to start at the hour the store is
   * seeded, which is what keeps one fixture genuinely in progress.
   */
  startHour: number | 'now'
  durationMinutes: number
  venue: VenueSelection
  budget: { min: number; max: number | null }
}

const VENUES: Record<string, VenueSelection> = {
  subangRacquet: {
    placeId: 'mock_place_subang_racquet',
    name: 'Subang Racquet Centre',
    address: 'Jalan SS15/4, Subang Jaya, Selangor',
    location: { lat: 3.0722, lng: 101.5859 },
    openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.0722&mlon=101.5859#map=17/3.0722/101.5859',
  },
  pjClimb: {
    placeId: 'mock_place_pj_climb',
    name: 'PJ Climb Lab',
    address: 'Jalan 51A/225, Petaling Jaya, Selangor',
    location: { lat: 3.1055, lng: 101.6421 },
    openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.1055&mlon=101.6421#map=17/3.1055/101.6421',
  },
  taskPark: {
    placeId: 'mock_place_taman_jaya',
    name: 'Taman Jaya Park',
    address: 'Jalan Barat, Petaling Jaya, Selangor',
    location: { lat: 3.1035, lng: 101.6437 },
    openStreetMapUrl: null,
  },
}

const SEEDS = [
  // In progress at seeding time, so "Happening now" is reachable.
  {
    buddyId: 'buddy_mei',
    sportId: 'climbing',
    dayOffset: 0,
    // Resolved at SEED time, not module-load time: a module-level
    // `new Date()` would freeze the hour when the bundle first evaluated.
    startHour: 'now',
    durationMinutes: 120,
    venue: VENUES.pjClimb,
    budget: { min: 20, max: 40 },
  },
  {
    buddyId: 'buddy_jason',
    sportId: 'badminton',
    dayOffset: 2,
    startHour: 19,
    durationMinutes: 120,
    venue: VENUES.subangRacquet,
    budget: { min: 20, max: 40 },
  },
  {
    buddyId: 'buddy_chloe',
    sportId: 'running',
    dayOffset: 9,
    startHour: 7,
    durationMinutes: 60,
    venue: VENUES.taskPark,
    budget: { min: 0, max: 10 },
  },
  // History, spanning enough weeks to produce more than one month group.
  {
    buddyId: 'buddy_jason',
    sportId: 'badminton',
    dayOffset: -3,
    startHour: 19,
    durationMinutes: 120,
    venue: VENUES.subangRacquet,
    budget: { min: 20, max: 40 },
  },
  {
    buddyId: 'buddy_mei',
    sportId: 'climbing',
    dayOffset: -11,
    startHour: 16,
    durationMinutes: 150,
    venue: VENUES.pjClimb,
    budget: { min: 20, max: 40 },
  },
  {
    buddyId: 'buddy_chloe',
    sportId: 'running',
    dayOffset: -26,
    startHour: 7,
    durationMinutes: 45,
    venue: VENUES.taskPark,
    budget: { min: 0, max: 10 },
  },
  {
    buddyId: 'buddy_jason',
    sportId: 'badminton',
    dayOffset: -41,
    startHour: 20,
    durationMinutes: 90,
    venue: VENUES.subangRacquet,
    budget: { min: 20, max: 40 },
  },
] as const satisfies readonly ActivitySeed[]

/** `dayOffset` + local hour → a real instant, resolved once at seeding. */
function instantAt(
  dayOffset: number,
  hour: number | 'now',
  from: Date,
): Date {
  const date = new Date(from)
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour === 'now' ? from.getHours() : hour, 0, 0, 0)
  return date
}

/**
 * The seeded activities for one mock account. `now` is injected so the
 * fixtures are deterministic in a test and relative in the app.
 */
export function buildMockActivities(
  currentUserId: string,
  now: Date,
): Activity[] {
  const seededAt = now.toISOString()

  return SEEDS.map((seed) => {
    const connectionId = createConnectionId(currentUserId, seed.buddyId)
    // The activity id IS its source plan id, exactly as a real confirmation
    // produces — so nothing in the app can tell a seeded activity apart.
    const planId = `${connectionId}__active`
    const startAt = instantAt(seed.dayOffset, seed.startHour, now)
    const endAt = new Date(startAt.getTime() + seed.durationMinutes * 60_000)

    return {
      // A pair can currently hold one active plan, so seeded history needs a
      // distinct id per session. Real confirmations still use the plan id.
      id: `${planId}__${seed.dayOffset}`,
      sourcePlanId: planId,
      connectionId,
      participants: sortConnectionPair(currentUserId, seed.buddyId),
      sportId: seed.sportId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      budget: {
        min: seed.budget.min,
        max: seed.budget.max,
        currency: 'MYR',
        unit: 'per-person',
      },
      venue: seed.venue,
      status: 'confirmed',
      createdBy: currentUserId,
      createdAt: seededAt,
      updatedAt: seededAt,
    } satisfies Activity
  })
}

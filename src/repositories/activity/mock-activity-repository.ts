import { MOCK_STORAGE_KEYS } from '@/constants/app'
import {
  canConfirmActivity,
  compareByEndDescending,
  compareByStart,
} from '@/lib/activity'
import { readActiveMockPlan, saveMockPlan } from '@/repositories/activity-plan/mock-activity-plan-repository'
import type {
  ActivityQuery,
  ActivityRepository,
} from '@/repositories/activity/activity-repository'
import { buildMockActivities } from '@/repositories/activity/mock-activities'
import { delay, readStoreRecord, writeStore } from '@/repositories/mock-store'
import {
  ACTIVITY_ERROR_CODES,
  activityError,
} from '@/services/activity/activity-error'
import type { Activity, ActivityPage } from '@/types/activity'

interface MockActivityStore {
  /** So clearing seeded history does not resurrect it on the next read. */
  seededUserIds: string[]
  activities: Activity[]
}

const EMPTY_STORE: MockActivityStore = { seededUserIds: [], activities: [] }

const readMockStore = () =>
  readStoreRecord<MockActivityStore>(MOCK_STORAGE_KEYS.activities, EMPTY_STORE)

const writeMockStore = (store: MockActivityStore) =>
  writeStore(MOCK_STORAGE_KEYS.activities, store)

/**
 * Mirrors the Firebase repository: the same deterministic id, the same
 * idempotency, the same plan re-verification and the same plan→confirmed
 * side effect, through `localStorage` behind the repository.
 */
/**
 * Seeds history once per mock account, so both tabs have something to show
 * before anybody confirms a plan. Dates are relative to the seeding moment —
 * see `mock-activities.ts`.
 */
function ensureSeeded(userId: string): MockActivityStore {
  const store = readMockStore()
  if (store.seededUserIds.includes(userId)) return store

  const seeded = buildMockActivities(userId, new Date()).filter(
    (activity) => !store.activities.some((entry) => entry.id === activity.id),
  )
  const next: MockActivityStore = {
    seededUserIds: [...store.seededUserIds, userId],
    activities: [...store.activities, ...seeded],
  }
  writeMockStore(next)
  return next
}

/**
 * The same paging contract the Firebase repository honours, so mock mode
 * cannot behave differently: scoped to the caller, bounded by `endAt` against
 * the INJECTED `now`, sorted, then cut into pages by activity id.
 *
 * A record with an unparseable `endAt` is skipped rather than crashing the
 * list — hand-edited localStorage is untrusted input (STEP 12.6).
 */
function page(
  { userId, now, limit, cursor }: ActivityQuery,
  matches: (activity: Activity, now: number) => boolean,
  [compare]: [(a: Activity, b: Activity) => number],
): ActivityPage {
  const time = now.getTime()
  const ordered = ensureSeeded(userId)
    .activities.filter(
      (activity) =>
        activity.participants.includes(userId) &&
        !Number.isNaN(Date.parse(activity.endAt)) &&
        matches(activity, time),
    )
    .sort(compare)

  const start = cursor
    ? ordered.findIndex((activity) => activity.id === cursor) + 1
    : 0
  const activities = ordered.slice(start, start + limit)
  const nextIndex = start + activities.length

  return {
    activities,
    nextCursor:
      nextIndex < ordered.length ? (activities.at(-1)?.id ?? null) : null,
  }
}

export const mockActivityRepository: ActivityRepository = {
  async createFromPlan(input) {
    await delay(null, 250)
    const store = readMockStore()

    // The deterministic id is what makes a second confirm a no-op.
    const existing = store.activities.find((entry) => entry.id === input.id)
    if (existing) return existing

    const plan = readActiveMockPlan(input.sourcePlanId)
    if (!plan) throw activityError(ACTIVITY_ERROR_CODES.missingPlan)
    if (!canConfirmActivity(plan)) {
      throw activityError(ACTIVITY_ERROR_CODES.notConfirmable)
    }

    const now = new Date().toISOString()
    const activity: Activity = {
      ...input,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    }
    writeMockStore({ ...store, activities: [...store.activities, activity] })

    // The plan becomes read-only history, exactly as in the transaction.
    saveMockPlan({ ...plan, status: 'confirmed', updatedAt: now })
    return activity
  },

  async getById(activityId: string) {
    await delay(null, 150)
    return (
      readMockStore().activities.find((entry) => entry.id === activityId) ??
      null
    )
  },

  async getUpcomingForUser(request) {
    await delay(null, 200)
    return page(request, (activity, now) => Date.parse(activity.endAt) >= now, [
      compareByStart,
    ])
  },

  async getPastForUser(request) {
    await delay(null, 200)
    return page(request, (activity, now) => Date.parse(activity.endAt) < now, [
      compareByEndDescending,
    ])
  },
}

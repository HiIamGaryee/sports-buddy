import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { canConfirmActivity } from '@/lib/activity'
import { readActiveMockPlan, saveMockPlan } from '@/repositories/activity-plan/mock-activity-plan-repository'
import type { ActivityRepository } from '@/repositories/activity/activity-repository'
import { delay, readStore, writeStore } from '@/repositories/mock-store'
import {
  ACTIVITY_ERROR_CODES,
  activityError,
} from '@/services/activity/activity-error'
import type { Activity } from '@/types/activity'

interface MockActivityStore {
  activities: Activity[]
}

const EMPTY_STORE: MockActivityStore = { activities: [] }

const readMockStore = () =>
  readStore<MockActivityStore>(MOCK_STORAGE_KEYS.activities, EMPTY_STORE)

const writeMockStore = (store: MockActivityStore) =>
  writeStore(MOCK_STORAGE_KEYS.activities, store)

/**
 * Mirrors the Firebase repository: the same deterministic id, the same
 * idempotency, the same plan re-verification and the same plan→confirmed
 * side effect, through `localStorage` behind the repository.
 */
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
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    }
    writeMockStore({ activities: [...store.activities, activity] })

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

  async getForUser(userId: string, limit: number) {
    await delay(null, 200)
    return readMockStore()
      .activities.filter((entry) => entry.participants.includes(userId))
      .slice(0, limit)
  },
}

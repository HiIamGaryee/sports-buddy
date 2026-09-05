import { MOCK_STORAGE_KEYS } from '@/constants/app'
import {
  applyAcceptance,
  applyProposal,
  createEmptyPlan,
  isAcceptStale,
} from '@/lib/planning'
import {
  activePlanId,
  type ActivityPlanRepository,
} from '@/repositories/activity-plan/activity-plan-repository'
import { delay, readStore, writeStore } from '@/repositories/mock-store'
import {
  PLANNING_ERROR_CODES,
  planningError,
} from '@/services/planning/planning-error'
import type { ActivityPlan } from '@/types/planning'

interface MockPlanStore {
  plans: ActivityPlan[]
}

const EMPTY_STORE: MockPlanStore = { plans: [] }

const readMockStore = () =>
  readStore<MockPlanStore>(MOCK_STORAGE_KEYS.activityPlans, EMPTY_STORE)

const writeMockStore = (store: MockPlanStore) =>
  writeStore(MOCK_STORAGE_KEYS.activityPlans, store)

const findPlan = (connectionId: string) =>
  readMockStore().plans.find((plan) => plan.id === activePlanId(connectionId)) ??
  null

function savePlan(plan: ActivityPlan) {
  const store = readMockStore()
  const others = store.plans.filter((entry) => entry.id !== plan.id)
  writeMockStore({ plans: [...others, plan] })
  notify()
}

interface PlanListener {
  connectionId: string
  onChange: (plan: ActivityPlan | null) => void
}

const listeners = new Set<PlanListener>()

/** Mirrors the Firebase document listener: every write re-emits to readers. */
function notify() {
  listeners.forEach((listener) =>
    listener.onChange(findPlan(listener.connectionId)),
  )
}

/**
 * Mirrors the Firebase repository exactly — same deterministic id, same
 * idempotency, same stale-version rejection — through `localStorage` behind
 * the repository. Mock mode must not behave differently from Firebase.
 */
export const mockActivityPlanRepository: ActivityPlanRepository = {
  subscribeToActivePlan(connectionId, onChange) {
    const listener: PlanListener = { connectionId, onChange }
    listeners.add(listener)
    onChange(findPlan(connectionId))
    return () => listeners.delete(listener)
  },

  async ensureActivePlan({ connectionId, participants, createdBy }) {
    await delay(null, 200)
    const existing = findPlan(connectionId)
    if (existing) return existing

    const created = createEmptyPlan({
      id: activePlanId(connectionId),
      connectionId,
      participants,
      createdBy,
      at: new Date().toISOString(),
    })
    savePlan(created)
    return created
  },

  async propose({ connectionId, kind, value, proposedBy }) {
    await delay(null, 180)
    const current = findPlan(connectionId)
    if (!current) throw planningError(PLANNING_ERROR_CODES.missing)

    const next = applyProposal(
      current,
      kind,
      value,
      proposedBy,
      new Date().toISOString(),
    )
    if (next !== current) savePlan(next)
    return next
  },

  async accept({ connectionId, kind, version, userId }) {
    await delay(null, 180)
    const current = findPlan(connectionId)
    if (!current) throw planningError(PLANNING_ERROR_CODES.missing)
    if (isAcceptStale(current, kind, version)) {
      throw planningError(PLANNING_ERROR_CODES.stale)
    }

    const next = applyAcceptance(
      current,
      kind,
      userId,
      new Date().toISOString(),
    )
    if (next !== current) savePlan(next)
    return next
  },
}

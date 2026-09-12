import {
  canPlanTogether,
  getLocalTimeZone,
  getTimeRangeError,
} from '@/lib/planning'
import { activityPlanRepository } from '@/repositories/repositories'
import {
  PLANNING_ERROR_CODES,
  PLANNING_FALLBACK_MESSAGES,
  PlanningError,
  planningError,
  toPlanningError,
} from '@/services/planning/planning-error'
import type {
  ActivityPlan,
  PlannedTime,
  ProposalKind,
} from '@/types/planning'
import { venueService } from '@/services/venue/venue-service'
import type { Connection } from '@/types/connection'
import type { BudgetPreference, SportId } from '@/types/sports-profile'
import type { VenueSelection } from '@/types/venue'
import { blockRepository } from '@/repositories/repositories'
import { getOtherParticipantId } from '@/lib/connection'

/**
 * The domain rules for planning: who may plan, and what counts as a valid
 * proposal. No React state, no Firebase.
 *
 * The relationship is the permission, so every guarded call takes a
 * `Connection` rather than a bare id — there is deliberately no
 * `createPlan(someUserId)`. Firestore rules enforce the same rule
 * server-side by reading `connections/{connectionId}`.
 *
 * Chat and planning stay separate: nothing here writes a message, and
 * `chatService` never touches a plan.
 */
async function assertCanPlan(
  connection: Connection | null | undefined,
  currentUserId: string,
) {
  const otherUserId = connection ? getOtherParticipantId(connection, currentUserId) : null
  if (!canPlanTogether(connection, currentUserId) || !otherUserId || (await blockRepository.getBlockedUserIds(currentUserId)).includes(otherUserId)) {
    throw planningError(PLANNING_ERROR_CODES.notConnected)
  }
}

export const activityPlanService = {
  canPlan: canPlanTogether,

  /** Scoped to one plan document. The hook owns the subscription's lifetime. */
  subscribe(
    connectionId: string,
    onChange: (plan: ActivityPlan | null) => void,
    onError: (error: Error) => void,
  ) {
    return activityPlanRepository.subscribeToActivePlan(
      connectionId,
      onChange,
      (error) => onError(toPlanningError(error, PLANNING_FALLBACK_MESSAGES.load)),
    )
  },

  /**
   * Resume the connection's active plan, or start one. Idempotent and
   * concurrency-safe, so two people tapping "Plan a session" at the same
   * moment share one draft.
   */
  async openPlan(
    connection: Connection | null | undefined,
    currentUserId: string,
  ): Promise<ActivityPlan> {
    try {
      await assertCanPlan(connection, currentUserId)
      const verified = connection as Connection
      return await activityPlanRepository.ensureActivePlan({
        connectionId: verified.id,
        participants: verified.participants,
        createdBy: currentUserId,
      })
    } catch (error) {
      throw toPlanningError(error, PLANNING_FALLBACK_MESSAGES.load)
    }
  },

  proposeSport(
    connection: Connection | null | undefined,
    currentUserId: string,
    sportId: SportId,
    /** The sports both people actually listed — nothing else is proposable. */
    sharedSportIds: readonly SportId[],
  ) {
    return propose(connection, currentUserId, 'sport', sportId, () =>
      sharedSportIds.includes(sportId)
        ? null
        : 'Pick a sport you both play.',
    )
  },

  proposeTime(
    connection: Connection | null | undefined,
    currentUserId: string,
    time: Omit<PlannedTime, 'timeZone'> & { timeZone?: string },
    now = new Date(),
  ) {
    const value: PlannedTime = {
      ...time,
      timeZone: time.timeZone ?? getLocalTimeZone(),
    }
    return propose(connection, currentUserId, 'time', value, () =>
      getTimeRangeError(value, now),
    )
  },

  /**
   * A venue can only be proposed once sport, time and budget are agreed —
   * the venue search depends on the agreed sport, and a venue for a session
   * nobody has settled is meaningless.
   */
  proposeVenue(
    connection: Connection | null | undefined,
    currentUserId: string,
    venue: VenueSelection,
    isPlanReadyForVenue: boolean,
  ) {
    return propose(connection, currentUserId, 'venue', venue, () => {
      if (!isPlanReadyForVenue) {
        return 'Agree the sport, time and budget before choosing a venue.'
      }
      return venueService.isValidSelection(venue)
        ? null
        : "That venue's details look wrong, so it wasn't saved."
    })
  },

  proposeBudget(
    connection: Connection | null | undefined,
    currentUserId: string,
    budget: BudgetPreference,
  ) {
    return propose(connection, currentUserId, 'budget', budget, () => {
      if (!Number.isFinite(budget.min) || budget.min < 0) {
        return 'Pick a budget.'
      }
      if (budget.max !== null && budget.max < budget.min) {
        return 'The top of the range has to be at least the bottom.'
      }
      return null
    })
  },

  /**
   * Agree to what the caller is currently looking at. `version` pins it: if
   * the proposal changed in the meantime the accept is rejected rather than
   * silently approving something else.
   */
  async accept(
    connection: Connection | null | undefined,
    currentUserId: string,
    kind: ProposalKind,
    version: number,
  ): Promise<ActivityPlan> {
    try {
      await assertCanPlan(connection, currentUserId)
      const verified = connection as Connection
      return await activityPlanRepository.accept({
        connectionId: verified.id,
        kind,
        version,
        userId: currentUserId,
      })
    } catch (error) {
      throw toPlanningError(error, PLANNING_FALLBACK_MESSAGES.update)
    }
  },
}

async function propose(
  connection: Connection | null | undefined,
  currentUserId: string,
  kind: ProposalKind,
  value: unknown,
  validate: () => string | null,
): Promise<ActivityPlan> {
  try {
    await assertCanPlan(connection, currentUserId)
    const problem = validate()
    if (problem) throw new PlanningError(problem)

    const verified = connection as Connection
    return await activityPlanRepository.propose({
      connectionId: verified.id,
      kind,
      value,
      proposedBy: currentUserId,
    })
  } catch (error) {
    throw toPlanningError(error, PLANNING_FALLBACK_MESSAGES.update)
  }
}

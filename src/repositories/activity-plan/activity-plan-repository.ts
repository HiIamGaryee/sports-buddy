import type { ActivityPlan, ProposalKind } from '@/types/planning'

export interface EnsureActivePlanInput {
  connectionId: string
  participants: [string, string]
  createdBy: string
}

export interface ProposeInput {
  connectionId: string
  kind: ProposalKind
  /** Already validated by the service. */
  value: unknown
  proposedBy: string
}

export interface AcceptInput {
  connectionId: string
  kind: ProposalKind
  /** The version the caller actually saw — a stale one is rejected. */
  version: number
  userId: string
}

/**
 * The shared activity plan. The repository owns persistence, atomicity and
 * realtime; the service owns authorization and validation.
 *
 * There is ONE active plan per connection, and it lives at a deterministic
 * document id (`activePlanId()`), which is what makes "Plan a session" from
 * both people at once produce one document instead of two — see
 * docs/planning.md §4.
 */
export interface ActivityPlanRepository {
  /** One scoped listener on one document. Never a collection query. */
  subscribeToActivePlan(
    connectionId: string,
    onChange: (plan: ActivityPlan | null) => void,
    onError: (error: unknown) => void,
  ): () => void

  /** Idempotent: returns the existing active plan, or creates it. */
  ensureActivePlan(input: EnsureActivePlanInput): Promise<ActivityPlan>

  /**
   * Replaces one proposal: bumps its version and resets acceptance to the
   * proposer. Read-modify-write inside a transaction, so a simultaneous
   * proposal on another field is never lost.
   */
  propose(input: ProposeInput): Promise<ActivityPlan>

  /**
   * Adds the caller to one proposal's `acceptedBy`, but only if `version`
   * still matches. Idempotent, and never touches the other participant.
   */
  accept(input: AcceptInput): Promise<ActivityPlan>
}

export const ACTIVITY_PLANS_COLLECTION = 'activityPlans'

/**
 * The active plan's document id. Derived from the connection so the id is
 * knowable without a query, but NOT equal to it, leaving room for archived
 * plans at other ids once a history step exists.
 */
export const activePlanId = (connectionId: string) => `${connectionId}__active`

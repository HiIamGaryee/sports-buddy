import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'

import {
  applyAcceptance,
  applyProposal,
  createEmptyPlan,
  createEmptyProposals,
  isAcceptStale,
  PROPOSAL_KEYS,
} from '@/lib/planning'
import { toActivityPlanDocument } from '@/repositories/activity-plan/activity-plan-document'
import {
  ACTIVITY_PLANS_COLLECTION,
  activePlanId,
  type ActivityPlanRepository,
} from '@/repositories/activity-plan/activity-plan-repository'
import { getFirebaseDb } from '@/services/firebase/client'
import {
  PLANNING_ERROR_CODES,
  planningError,
} from '@/services/planning/planning-error'
import type { ActivityPlan, ProposalKind } from '@/types/planning'

const planRef = (db: Firestore, connectionId: string) =>
  doc(db, ACTIVITY_PLANS_COLLECTION, activePlanId(connectionId))

/** Only the touched proposal, the derived status and the timestamps move. */
function proposalPatch(plan: ActivityPlan, kind: ProposalKind) {
  const key = PROPOSAL_KEYS[kind]
  return {
    [key]: { ...plan[key], updatedAt: serverTimestamp() },
    status: plan.status,
    updatedAt: serverTimestamp(),
  }
}

export const firebaseActivityPlanRepository: ActivityPlanRepository = {
  subscribeToActivePlan(connectionId, onChange, onError) {
    // One document. There is deliberately no query over `activityPlans`.
    return onSnapshot(
      planRef(getFirebaseDb(), connectionId),
      (snapshot) =>
        onChange(
          snapshot.exists()
            ? toActivityPlanDocument(snapshot.id, snapshot.data())
            : null,
        ),
      onError,
    )
  },

  /**
   * A transaction on a deterministic id, so both people tapping "Plan a
   * session" at once produce ONE draft rather than two competing ones.
   */
  ensureActivePlan({ connectionId, participants, createdBy }) {
    const db = getFirebaseDb()
    const reference = planRef(db, connectionId)

    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      const existing = snapshot.exists()
        ? toActivityPlanDocument(snapshot.id, snapshot.data())
        : null
      if (existing) return existing

      transaction.set(reference, {
        id: reference.id,
        connectionId,
        participants,
        status: 'draft',
        ...createEmptyProposals(),
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // The authoritative timestamps arrive moments later via the listener.
      return createEmptyPlan({
        id: reference.id,
        connectionId,
        participants,
        createdBy,
        at: new Date().toISOString(),
      })
    })
  },

  /**
   * Read-modify-write inside a transaction: a simultaneous change to another
   * field is never lost, because the whole document is re-read first and only
   * the touched proposal is patched.
   */
  propose({ connectionId, kind, value, proposedBy }) {
    const db = getFirebaseDb()
    const reference = planRef(db, connectionId)

    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      const current = snapshot.exists()
        ? toActivityPlanDocument(snapshot.id, snapshot.data())
        : null
      if (!current) throw planningError(PLANNING_ERROR_CODES.missing)

      const next = applyProposal(
        current,
        kind,
        value,
        proposedBy,
        new Date().toISOString(),
      )
      if (next !== current) transaction.update(reference, proposalPatch(next, kind))
      return next
    })
  },

  accept({ connectionId, kind, version, userId }) {
    const db = getFirebaseDb()
    const reference = planRef(db, connectionId)

    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      const current = snapshot.exists()
        ? toActivityPlanDocument(snapshot.id, snapshot.data())
        : null
      if (!current) throw planningError(PLANNING_ERROR_CODES.missing)
      // The version the caller saw must still be the live one.
      if (isAcceptStale(current, kind, version)) {
        throw planningError(PLANNING_ERROR_CODES.stale)
      }

      const next = applyAcceptance(
        current,
        kind,
        userId,
        new Date().toISOString(),
      )
      if (next !== current) transaction.update(reference, proposalPatch(next, kind))
      return next
    })
  },
}

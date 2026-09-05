import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Firestore,
} from 'firebase/firestore'

import {
  ACTIVITIES_COLLECTION,
  type ActivityRepository,
} from '@/repositories/activity/activity-repository'
import { toActivityDocument } from '@/repositories/activity/activity-document'
import {
  ACTIVITY_PLANS_COLLECTION,
} from '@/repositories/activity-plan/activity-plan-repository'
import { toActivityPlanDocument } from '@/repositories/activity-plan/activity-plan-document'
import { canConfirmActivity } from '@/lib/activity'
import { getFirebaseDb } from '@/services/firebase/client'
import {
  ACTIVITY_ERROR_CODES,
  activityError,
} from '@/services/activity/activity-error'
import type { Activity, CreateActivityInput } from '@/types/activity'

const activityRef = (db: Firestore, activityId: string) =>
  doc(db, ACTIVITIES_COLLECTION, activityId)

const planRef = (db: Firestore, planId: string) =>
  doc(db, ACTIVITY_PLANS_COLLECTION, planId)

export const firebaseActivityRepository: ActivityRepository = {
  /**
   * One transaction covering both documents: the activity is created and the
   * plan is marked `confirmed` together, or neither happens.
   *
   * Idempotency comes from the deterministic id — the activity lives at its
   * source plan's id, so two people confirming at the same moment both land
   * on the same document. The first commits; the second re-reads it inside
   * its own transaction and returns it untouched.
   */
  createFromPlan(input: CreateActivityInput) {
    const db = getFirebaseDb()
    const activity = activityRef(db, input.id)
    const plan = planRef(db, input.sourcePlanId)

    return runTransaction(db, async (transaction) => {
      const existingSnapshot = await transaction.get(activity)
      if (existingSnapshot.exists()) {
        const existing = toActivityDocument(
          existingSnapshot.id,
          existingSnapshot.data(),
        )
        if (existing) return existing
      }

      // Re-verify against the live plan, not the caller's copy of it.
      const planSnapshot = await transaction.get(plan)
      const currentPlan = planSnapshot.exists()
        ? toActivityPlanDocument(planSnapshot.id, planSnapshot.data())
        : null
      if (!currentPlan) throw activityError(ACTIVITY_ERROR_CODES.missingPlan)
      if (!canConfirmActivity(currentPlan)) {
        throw activityError(ACTIVITY_ERROR_CODES.notConfirmable)
      }

      transaction.set(activity, {
        id: input.id,
        sourcePlanId: input.sourcePlanId,
        connectionId: input.connectionId,
        participants: input.participants,
        sportId: input.sportId,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        budget: input.budget,
        venue: input.venue,
        status: 'upcoming',
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // The plan becomes read-only history from this point.
      transaction.update(plan, {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      })

      const now = new Date().toISOString()
      return {
        ...input,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      } satisfies Activity
    })
  },

  async getById(activityId: string) {
    const snapshot = await getDoc(activityRef(getFirebaseDb(), activityId))
    return snapshot.exists()
      ? toActivityDocument(snapshot.id, snapshot.data())
      : null
  },

  async getForUser(userId: string, limit: number) {
    // Scoped to this user. No `orderBy`, so no composite index is needed —
    // status filtering and start-time ordering happen in the service.
    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), ACTIVITIES_COLLECTION),
        where('participants', 'array-contains', userId),
        firestoreLimit(limit),
      ),
    )
    return snapshot.docs.flatMap((entry) => {
      const activity = toActivityDocument(entry.id, entry.data())
      return activity ? [activity] : []
    })
  },
}

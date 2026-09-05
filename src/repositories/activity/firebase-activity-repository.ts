import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type DocumentSnapshot,
  type Firestore,
  type Query,
} from 'firebase/firestore'

import {
  ACTIVITIES_COLLECTION,
  type ActivityQuery,
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
import type {
  Activity,
  ActivityPage,
  CreateActivityInput,
} from '@/types/activity'

const activityRef = (db: Firestore, activityId: string) =>
  doc(db, ACTIVITIES_COLLECTION, activityId)

const planRef = (db: Firestore, planId: string) =>
  doc(db, ACTIVITY_PLANS_COLLECTION, planId)

/**
 * Both list queries are the same shape: scoped to the caller, bounded by
 * `endAt`, ordered, limited, and continued from an opaque cursor. Only the
 * time bound and the ordering differ, so they are passed in.
 *
 * The cursor is resolved back to a document snapshot HERE. A Firestore
 * snapshot never leaves the repository — callers hold an activity ID, exactly
 * as STEP 9's chat pagination does.
 */
async function readPage(
  { userId, now, limit, cursor }: ActivityQuery,
  applyBounds: (base: Query, now: Timestamp) => Query,
): Promise<ActivityPage> {
  const db = getFirebaseDb()
  const base = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('participants', 'array-contains', userId),
  )

  let bounded = applyBounds(base, Timestamp.fromDate(now))

  if (cursor) {
    const anchor: DocumentSnapshot = await getDoc(activityRef(db, cursor))
    // A cursor pointing at a deleted or unreadable document simply starts the
    // page from the beginning rather than failing the whole read.
    if (anchor.exists()) bounded = query(bounded, startAfter(anchor))
  }

  const snapshot = await getDocs(query(bounded, firestoreLimit(limit)))
  const activities = snapshot.docs.flatMap((entry) => {
    const activity = toActivityDocument(entry.id, entry.data())
    return activity ? [activity] : []
  })

  // A full page means there may be more; a short page is definitively the end.
  const last = snapshot.docs.at(-1)
  return {
    activities,
    nextCursor: snapshot.docs.length === limit && last ? last.id : null,
  }
}

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
        status: 'confirmed',
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
        status: 'confirmed',
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

  getUpcomingForUser(request: ActivityQuery) {
    // `endAt >= now` keeps a session that is currently in progress in the
    // upcoming list, and ordering by `startAt` puts the soonest first.
    return readPage(request, (base, now) =>
      query(base, where('endAt', '>=', now), orderBy('endAt'), orderBy('startAt')),
    )
  },

  getPastForUser(request: ActivityQuery) {
    // Most recently finished first, so history opens on what just happened.
    return readPage(request, (base, now) =>
      query(base, where('endAt', '<', now), orderBy('endAt', 'desc')),
    )
  },
}

import {
  collection,
  deleteDoc,
  doc,
  FirestoreError,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { toGroupActivityDocument } from '@/repositories/group-activity/group-activity-document'
import {
  GROUP_ACTIVITIES_COLLECTION,
  type GroupActivityRepository,
} from '@/repositories/group-activity/group-activity-repository'
import {
  applyJoinGroupActivity,
  applyLeaveGroupActivity,
  applyRemoveParticipant,
  type GroupActivityJoinTransition,
} from '@/lib/group-activity'
import {
  GROUP_ACTIVITY_ERROR_CODES,
  groupActivityError,
  refusalError,
} from '@/services/group-activity/group-activity-error'
import { getFirebaseDb } from '@/services/firebase/client'
import type { CreateGroupActivityInput, GroupActivity } from '@/types/group-activity'

const activitiesCollection = () => collection(getFirebaseDb(), GROUP_ACTIVITIES_COLLECTION)

const activityRef = (activityId: string) =>
  doc(getFirebaseDb(), GROUP_ACTIVITIES_COLLECTION, activityId)

/** Every writable field named explicitly — never a spread of caller input. */
const writableFields = (input: CreateGroupActivityInput) => ({
  sportId: input.sportId,
  title: input.title,
  description: input.description,
  startAt: Timestamp.fromDate(new Date(input.startAt)),
  endAt: input.endAt ? Timestamp.fromDate(new Date(input.endAt)) : null,
  timeZone: input.timeZone,
  areaId: input.areaId,
  venueName: input.venueName,
  budget: { min: input.budget.min, max: input.budget.max },
  preferredSkillLevel: input.preferredSkillLevel,
  maxParticipants: input.maxParticipants,
})

const toActivities = (docs: readonly { id: string; data: () => Record<string, unknown> }[]) =>
  docs.flatMap((entry) => {
    const activity = toGroupActivityDocument(entry.id, entry.data())
    return activity ? [activity] : []
  })

/**
 * Read the LIVE activity inside a transaction, compute the transition with
 * the shared pure function, and write only `participantIds`. A concurrent
 * Join on the last spot makes one transaction retry, see it full, and
 * refuse — the rules enforce the same limit independently.
 */
async function transitionParticipants(
  activityId: string,
  transition: (activity: GroupActivity) => GroupActivityJoinTransition,
): Promise<GroupActivity> {
  const reference = activityRef(activityId)
  return runTransaction(getFirebaseDb(), async (transaction) => {
    const snapshot = await transaction.get(reference)
    const activity = snapshot.exists()
      ? toGroupActivityDocument(snapshot.id, snapshot.data())
      : null
    if (!activity) throw groupActivityError(GROUP_ACTIVITY_ERROR_CODES.missing)

    const next = transition(activity)
    if (!next.ok) throw refusalError(next.reason)
    if (next.unchanged) return activity

    transaction.update(reference, { participantIds: next.participantIds })
    return { ...activity, participantIds: next.participantIds }
  })
}

export const firebaseGroupActivityRepository: GroupActivityRepository = {
  async listUpcoming(now, limit) {
    // Range and order on the same field, so no composite index is needed.
    const snapshot = await getDocs(
      query(
        activitiesCollection(),
        where('startAt', '>', Timestamp.fromDate(now)),
        orderBy('startAt', 'asc'),
        firestoreLimit(limit),
      ),
    )
    return toActivities(snapshot.docs)
  },

  async listByOrganizer(organizerId, limit) {
    const snapshot = await getDocs(
      query(
        activitiesCollection(),
        where('organizerId', '==', organizerId),
        firestoreLimit(limit),
      ),
    )
    return toActivities(snapshot.docs)
  },

  async listJoinedBy(userId, limit) {
    const snapshot = await getDocs(
      query(
        activitiesCollection(),
        where('participantIds', 'array-contains', userId),
        firestoreLimit(limit),
      ),
    )
    return toActivities(snapshot.docs)
  },

  async getById(activityId) {
    try {
      const snapshot = await getDoc(activityRef(activityId))
      return snapshot.exists() ? toGroupActivityDocument(snapshot.id, snapshot.data()) : null
    } catch (error) {
      if (error instanceof FirestoreError && error.code === 'permission-denied') return null
      throw error
    }
  },

  async create(input) {
    const reference = doc(activitiesCollection())
    await setDoc(reference, {
      id: reference.id,
      organizerId: input.organizerId,
      ...writableFields(input),
      participantIds: [],
      createdAt: serverTimestamp(),
    })
    return {
      ...input,
      id: reference.id,
      participantIds: [],
      createdAt: null,
      updatedAt: null,
    }
  },

  async update(activityId, input) {
    await updateDoc(activityRef(activityId), {
      ...writableFields(input),
      updatedAt: serverTimestamp(),
    })
  },

  remove(activityId) {
    return deleteDoc(activityRef(activityId))
  },

  join(activityId, userId) {
    return transitionParticipants(activityId, (activity) =>
      applyJoinGroupActivity(activity, userId, new Date()),
    )
  },

  async leave(activityId, userId) {
    await transitionParticipants(activityId, (activity) =>
      applyLeaveGroupActivity(activity, userId),
    )
  },

  async removeParticipant(activityId, organizerId, userId) {
    await transitionParticipants(activityId, (activity) =>
      applyRemoveParticipant(activity, organizerId, userId),
    )
  },
}

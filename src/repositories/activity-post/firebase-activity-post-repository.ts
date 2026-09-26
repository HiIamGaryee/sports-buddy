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

import {
  ACTIVITY_POSTS_COLLECTION,
  type ActivityPostRepository,
} from '@/repositories/activity-post/activity-post-repository'
import { toActivityPostDocument } from '@/repositories/activity-post/activity-post-document'
import {
  applyApprove,
  applyDecline,
  applyJoin,
  applyLeave,
  NEW_POST_JOINS,
  type JoinTransition,
} from '@/lib/activity-post'
import {
  ACTIVITY_POST_ERROR_CODES,
  activityPostError,
  refusalError,
} from '@/services/activity-post/activity-post-error'
import { getFirebaseDb } from '@/services/firebase/client'
import type {
  ActivityPost,
  CreateActivityPostInput,
} from '@/types/activity-post'

const postsCollection = () =>
  collection(getFirebaseDb(), ACTIVITY_POSTS_COLLECTION)

/** Every writable field named explicitly — never a spread of caller input. */
const writableFields = (input: CreateActivityPostInput) => ({
  sportId: input.sportId,
  startAt: Timestamp.fromDate(new Date(input.startAt)),
  endAt: Timestamp.fromDate(new Date(input.endAt)),
  timeZone: input.timeZone,
  areaId: input.areaId,
  venueName: input.venueName,
  budget: { min: input.budget.min, max: input.budget.max },
  joinPolicy: input.joinPolicy,
})

const postRef = (postId: string) =>
  doc(getFirebaseDb(), ACTIVITY_POSTS_COLLECTION, postId)

const toPosts = (docs: readonly { id: string; data: () => Record<string, unknown> }[]) =>
  docs.flatMap((entry) => {
    const post = toActivityPostDocument(entry.id, entry.data())
    return post ? [post] : []
  })

/**
 * Read the LIVE post inside a transaction, compute the transition with the
 * shared pure function, and write only the two join lists. A concurrent Join
 * on the last spot makes one of the two transactions retry, see it full, and
 * refuse — the rules enforce the same limit independently.
 */
async function transitionJoins(
  postId: string,
  transition: (post: ActivityPost) => JoinTransition,
): Promise<ActivityPost> {
  const reference = postRef(postId)
  return runTransaction(getFirebaseDb(), async (transaction) => {
    const snapshot = await transaction.get(reference)
    const post = snapshot.exists()
      ? toActivityPostDocument(snapshot.id, snapshot.data())
      : null
    if (!post) throw activityPostError(ACTIVITY_POST_ERROR_CODES.missing)

    const next = transition(post)
    if (!next.ok) throw refusalError(next.reason)
    if (next.unchanged) return post

    transaction.update(reference, {
      joinedIds: next.joinedIds,
      pendingIds: next.pendingIds,
    })
    return { ...post, joinedIds: next.joinedIds, pendingIds: next.pendingIds }
  })
}

export const firebaseActivityPostRepository: ActivityPostRepository = {
  async listUpcoming(now, limit) {
    // Range and order on the SAME field, so no composite index is needed.
    const snapshot = await getDocs(
      query(
        postsCollection(),
        // Link-only and invite posts are never listed. This equality is ALSO
        // what lets the rules prove the query safe — rules are not filters.
        // Composite index: visibility + startAt (firestore.indexes.json).
        where('visibility', '==', 'public'),
        where('startAt', '>', Timestamp.fromDate(now)),
        orderBy('startAt', 'asc'),
        firestoreLimit(limit),
      ),
    )
    return snapshot.docs.flatMap((entry) => {
      const post = toActivityPostDocument(entry.id, entry.data())
      return post ? [post] : []
    })
  },

  async listByAuthor(authorId, limit) {
    // Equality only, no orderBy, so no composite index; sorted by the caller.
    const snapshot = await getDocs(
      query(
        postsCollection(),
        where('authorId', '==', authorId),
        firestoreLimit(limit),
      ),
    )
    return snapshot.docs.flatMap((entry) => {
      const post = toActivityPostDocument(entry.id, entry.data())
      return post ? [post] : []
    })
  },

  async getById(postId) {
    try {
      const snapshot = await getDoc(
        doc(getFirebaseDb(), ACTIVITY_POSTS_COLLECTION, postId),
      )
      return snapshot.exists()
        ? toActivityPostDocument(snapshot.id, snapshot.data())
        : null
    } catch (error) {
      // The rules refuse a private invite for anyone else AND an id that does
      // not exist; both mean "no such post" to this viewer.
      if (error instanceof FirestoreError && error.code === 'permission-denied') {
        return null
      }
      throw error
    }
  },

  async create(input) {
    const reference = doc(postsCollection())
    await setDoc(reference, {
      id: reference.id,
      authorId: input.authorId,
      ...writableFields(input),
      // Who can see it is fixed at creation; an edit may only switch a
      // shared post between public and link-only.
      visibility: input.visibility,
      invitedId: input.invitedId,
      capacity: NEW_POST_JOINS.capacity,
      joinedIds: [],
      pendingIds: [],
      createdAt: serverTimestamp(),
    })
    return {
      ...input,
      id: reference.id,
      capacity: NEW_POST_JOINS.capacity,
      joinedIds: [],
      pendingIds: [],
      createdAt: null,
      updatedAt: null,
    }
  },

  async update(postId, input) {
    await updateDoc(doc(getFirebaseDb(), ACTIVITY_POSTS_COLLECTION, postId), {
      ...writableFields(input),
      visibility: input.visibility,
      updatedAt: serverTimestamp(),
    })
  },

  remove(postId) {
    return deleteDoc(postRef(postId))
  },

  async listJoinedBy(userId, limit) {
    const snapshot = await getDocs(
      query(
        postsCollection(),
        where('joinedIds', 'array-contains', userId),
        firestoreLimit(limit),
      ),
    )
    return toPosts(snapshot.docs)
  },

  async listRequestedBy(userId, limit) {
    const snapshot = await getDocs(
      query(
        postsCollection(),
        where('pendingIds', 'array-contains', userId),
        firestoreLimit(limit),
      ),
    )
    return toPosts(snapshot.docs)
  },

  async listInvitedFor(userId, limit) {
    const snapshot = await getDocs(
      query(
        postsCollection(),
        where('invitedId', '==', userId),
        firestoreLimit(limit),
      ),
    )
    return toPosts(snapshot.docs)
  },

  join(postId, userId) {
    return transitionJoins(postId, (post) => applyJoin(post, userId, new Date()))
  },

  async leave(postId, userId) {
    await transitionJoins(postId, (post) => applyLeave(post, userId))
  },

  async approve(postId, authorId, userId) {
    await transitionJoins(postId, (post) => applyApprove(post, authorId, userId))
  },

  async decline(postId, authorId, userId) {
    await transitionJoins(postId, (post) => applyDecline(post, authorId, userId))
  },
}

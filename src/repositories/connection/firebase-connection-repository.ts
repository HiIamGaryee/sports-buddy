import {
  collection,
  doc,
  limit as firestoreLimit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { createConnectionId, isMutuallyRequested, sortConnectionPair } from '@/lib/connection'
import { toConnectionDocument } from '@/repositories/connection/connection-document'
import {
  CONNECTIONS_COLLECTION,
  CONNECTION_BATCH_LIMIT,
  type ConnectionRepository,
} from '@/repositories/connection/connection-repository'
import {
  CONNECTION_ERROR_CODES,
  connectionError,
} from '@/services/connection/connection-error'
import { getFirebaseDb } from '@/services/firebase/client'
import type { Connection } from '@/types/connection'

const connectionDoc = (currentUserId: string, targetUserId: string) =>
  doc(
    getFirebaseDb(),
    CONNECTIONS_COLLECTION,
    createConnectionId(currentUserId, targetUserId),
  )

/**
 * The optimistic timestamps returned to the caller. The authoritative server
 * values arrive moments later through the subscription, which is the source
 * of truth for what the UI shows.
 */
const nowIso = () => new Date().toISOString()

export const firebaseConnectionRepository: ConnectionRepository = {
  subscribeForUser(userId, onChange, onError) {
    // Scoped to the signed-in user. `array-contains` + `limit` needs no
    // composite index, and the rules make a wider read impossible anyway.
    return onSnapshot(
      query(
        collection(getFirebaseDb(), CONNECTIONS_COLLECTION),
        where('participants', 'array-contains', userId),
        firestoreLimit(CONNECTION_BATCH_LIMIT),
      ),
      (snapshot) =>
        onChange(
          snapshot.docs.flatMap((entry) => {
            const connection = toConnectionDocument(entry.id, entry.data())
            return connection ? [connection] : []
          }),
        ),
      onError,
    )
  },

  /**
   * A transaction, because both people can press Connect at the same moment.
   * Reading and writing atomically is what makes the outcome `connected`
   * instead of one request silently overwriting the other.
   */
  connect(currentUserId, targetUserId) {
    const reference = connectionDoc(currentUserId, targetUserId)

    return runTransaction(getFirebaseDb(), async (transaction) => {
      const snapshot = await transaction.get(reference)

      if (!snapshot.exists()) {
        const participants = sortConnectionPair(currentUserId, targetUserId)
        transaction.set(reference, {
          id: reference.id,
          participants,
          requestedBy: [currentUserId],
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          connectedAt: null,
        })
        const created = nowIso()
        return {
          id: reference.id,
          participants,
          requestedBy: [currentUserId],
          status: 'pending',
          createdAt: created,
          updatedAt: created,
          connectedAt: null,
        } satisfies Connection
      }

      const existing = toConnectionDocument(snapshot.id, snapshot.data())
      if (!existing) throw connectionError(CONNECTION_ERROR_CODES.notYourRequest)
      // Idempotent: a double tap or a retry must not duplicate the requester.
      if (existing.requestedBy.includes(currentUserId)) return existing

      const requestedBy = [...existing.requestedBy, currentUserId]
      const mutual = isMutuallyRequested(existing.participants, requestedBy)
      transaction.update(reference, {
        requestedBy,
        status: mutual ? 'connected' : 'pending',
        connectedAt: mutual ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      })

      return {
        ...existing,
        requestedBy,
        status: mutual ? 'connected' : 'pending',
        connectedAt: mutual ? nowIso() : null,
        updatedAt: nowIso(),
      } satisfies Connection
    })
  },

  /** Only the sole requester of a pending relationship may delete it. */
  async cancelPending(currentUserId, targetUserId) {
    const reference = connectionDoc(currentUserId, targetUserId)

    await runTransaction(getFirebaseDb(), async (transaction) => {
      const snapshot = await transaction.get(reference)
      // Already gone — cancelling twice is not an error.
      if (!snapshot.exists()) return

      const existing = toConnectionDocument(snapshot.id, snapshot.data())
      if (!existing) return
      if (existing.status === 'connected') {
        throw connectionError(CONNECTION_ERROR_CODES.alreadyConnected)
      }
      if (
        existing.requestedBy.length !== 1 ||
        existing.requestedBy[0] !== currentUserId
      ) {
        throw connectionError(CONNECTION_ERROR_CODES.notYourRequest)
      }

      transaction.delete(reference)
    })
  },
}

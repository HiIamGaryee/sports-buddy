import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

import {
  PROFILE_ID_QUERY_LIMIT,
  type DiscoverRepository,
} from '@/repositories/discover/discover-repository'
import { toDiscoveryProfileDocument } from '@/repositories/discover/discovery-profile-document'
import { PUBLIC_PROFILES_COLLECTION } from '@/repositories/public-profile/public-profile-repository'
import { getFirebaseDb } from '@/services/firebase/client'

export const firebaseDiscoverRepository: DiscoverRepository = {
  async getCandidates(limit: number) {
    // Single-field ordering only, so no composite index is required.
    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), PUBLIC_PROFILES_COLLECTION),
        orderBy('updatedAt', 'desc'),
        firestoreLimit(limit),
      ),
    )
    return snapshot.docs.map((entry) =>
      toDiscoveryProfileDocument(entry.id, entry.data()),
    )
  },

  async getProfileById(userId: string) {
    const snapshot = await getDoc(
      doc(getFirebaseDb(), PUBLIC_PROFILES_COLLECTION, userId),
    )
    return snapshot.exists()
      ? toDiscoveryProfileDocument(snapshot.id, snapshot.data())
      : null
  },

  async getProfilesByIds(userIds: readonly string[]) {
    if (userIds.length === 0) return []

    // One query per chunk of 30 — never one query per id.
    const chunks: string[][] = []
    for (let index = 0; index < userIds.length; index += PROFILE_ID_QUERY_LIMIT) {
      chunks.push([...userIds.slice(index, index + PROFILE_ID_QUERY_LIMIT)])
    }

    const results = await Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            collection(getFirebaseDb(), PUBLIC_PROFILES_COLLECTION),
            where(documentId(), 'in', chunk),
          ),
        ),
      ),
    )
    return results.flatMap((snapshot) =>
      snapshot.docs.map((entry) =>
        toDiscoveryProfileDocument(entry.id, entry.data()),
      ),
    )
  },
}

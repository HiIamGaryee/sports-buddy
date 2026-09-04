import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
} from 'firebase/firestore'

import type { DiscoverRepository } from '@/repositories/discover/discover-repository'
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
}

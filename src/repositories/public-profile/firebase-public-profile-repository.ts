import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { toDiscoveryProfileDocument } from '@/repositories/discover/discovery-profile-document'
import {
  PUBLIC_PROFILES_COLLECTION,
  type PublicProfileRepository,
} from '@/repositories/public-profile/public-profile-repository'
import { getFirebaseDb } from '@/services/firebase/client'
import type { DiscoveryProfile } from '@/types/discovery-profile'

const publicDoc = (userId: string) =>
  doc(getFirebaseDb(), PUBLIC_PROFILES_COLLECTION, userId)

export const firebasePublicProfileRepository: PublicProfileRepository = {
  async getByUserId(userId) {
    const snapshot = await getDoc(publicDoc(userId))
    return snapshot.exists()
      ? toDiscoveryProfileDocument(snapshot.id, snapshot.data())
      : null
  },

  async upsert(profile: DiscoveryProfile) {
    // The projection is written whole, with a server timestamp for freshness.
    await setDoc(publicDoc(profile.userId), {
      ...profile,
      updatedAt: serverTimestamp(),
    })
  },

  async remove(userId: string) {
    await deleteDoc(publicDoc(userId))
  },
}

import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'

import { toBuddyReviewDocument } from '@/repositories/ratings/rating-document'
import {
  BUDDY_RATINGS_COLLECTION,
  type BuddyRatingRepository,
} from '@/repositories/ratings/rating-repository'
import { getFirebaseDb } from '@/services/firebase/client'

const ratings = () => collection(getFirebaseDb(), BUDDY_RATINGS_COLLECTION)

const read = async (field: 'reviewedUserId' | 'reviewerId', value: string, max: number) => {
  const snapshot = await getDocs(query(ratings(), where(field, '==', value), limit(max)))
  return snapshot.docs.flatMap((entry) => {
    const review = toBuddyReviewDocument(entry.id, entry.data())
    return review ? [review] : []
  })
}

export const firebaseRatingRepository: BuddyRatingRepository = {
  listByReviewedUser: (userId, max) => read('reviewedUserId', userId, max),
  listByReviewer: (userId, max) => read('reviewerId', userId, max),

  async create(input) {
    const id = `${input.eventId}__${input.reviewerId}`
    const reference = doc(getFirebaseDb(), BUDDY_RATINGS_COLLECTION, id)
    await setDoc(reference, {
      id,
      eventId: input.eventId,
      reviewerId: input.reviewerId,
      reviewedUserId: input.reviewedUserId,
      attendanceStatus: input.attendanceStatus,
      punctuality: input.punctuality,
      experience: input.experience,
      note: input.note,
      createdAt: serverTimestamp(),
    })
    return { ...input, id, createdAt: new Date().toISOString() }
  },
}

import { useSyncExternalStore } from 'react'

import {
  buddyReviewStore,
  calculateReliability,
} from '@/features/ratings/mock-ratings'

export function useBuddyRatings() {
  const reviews = useSyncExternalStore(
    buddyReviewStore.subscribe,
    buddyReviewStore.getSnapshot,
    buddyReviewStore.getSnapshot,
  )

  return {
    reviews,
    calculateReliability: (buddyId: string) =>
      calculateReliability(reviews, buddyId),
    submitReview: buddyReviewStore.submit,
  }
}

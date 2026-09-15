import { useSyncExternalStore } from 'react'

import { useCoarseNow } from '@/features/activities/use-activities'
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
  // `now` is injected rather than read inside the calculation, so the trailing
  // window re-derives on the project's shared once-a-minute tick.
  const now = useCoarseNow()

  return {
    reviews,
    calculateReliability: (buddyId: string) =>
      calculateReliability(reviews, buddyId, now),
    submitReview: buddyReviewStore.submit,
  }
}

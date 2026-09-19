import { useEffect, useState } from 'react'

import { useCoarseNow } from '@/features/activities/use-activities'
import { useAuth } from '@/hooks/use-auth'
import { calculateBuddyReliability } from '@/lib/buddy-rating'
import { ratingsService } from '@/services/ratings/ratings-service'
import type { BuddyReview } from '@/types/buddy-rating'

export function useBuddyRatings(reviewedUserId?: string) {
  const { user } = useAuth()
  const queryUserId = reviewedUserId ?? user?.id ?? null
  const [reviews, setReviews] = useState<readonly BuddyReview[]>([])
  useEffect(() => {
    if (!queryUserId) return
    let active = true
    const read = reviewedUserId
      ? ratingsService.listByReviewedUser(queryUserId)
      : ratingsService.listByReviewer(queryUserId)
    read.then((next) => { if (active) setReviews(next) }).catch(() => { if (active) setReviews([]) })
    return () => { active = false }
  }, [queryUserId, reviewedUserId])
  // `now` is injected rather than read inside the calculation, so the trailing
  // window re-derives on the project's shared once-a-minute tick.
  const now = useCoarseNow()

  return {
    reviews,
    calculateReliability: (buddyId: string) =>
      calculateBuddyReliability(reviews, buddyId, now),
    submitReview: (input: Parameters<typeof ratingsService.create>[0]) =>
      ratingsService.create(input, user?.id ?? ''),
  }
}

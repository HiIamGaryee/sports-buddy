import { buddyReviewStore, DEMO_SELF_ID, MOCK_REVIEWS } from '@/features/ratings/mock-ratings'
import type { BuddyRatingRepository } from '@/repositories/ratings/rating-repository'

const reviewSnapshot = () => buddyReviewStore.getSnapshot().length > 0 ? buddyReviewStore.getSnapshot() : MOCK_REVIEWS

export const mockRatingRepository: BuddyRatingRepository = {
  async listByReviewedUser(userId) {
    return reviewSnapshot().filter(
      (review) => review.reviewedUserId === userId ||
        (review.reviewedUserId === DEMO_SELF_ID && userId.startsWith('user_demo')),
    )
  },

  async listByReviewer(userId) {
    return reviewSnapshot().filter((review) => review.reviewerId === userId)
  },

  async create(input) {
    return buddyReviewStore.submit(input)
  },
}

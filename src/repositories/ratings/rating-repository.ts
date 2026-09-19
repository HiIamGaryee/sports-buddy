import type { BuddyReview } from '@/types/buddy-rating'

export type CreateBuddyReviewInput = Omit<BuddyReview, 'id' | 'createdAt'>

export interface BuddyRatingRepository {
  listByReviewedUser(userId: string, limit: number): Promise<BuddyReview[]>
  listByReviewer(userId: string, limit: number): Promise<BuddyReview[]>
  create(input: CreateBuddyReviewInput): Promise<BuddyReview>
}

export const BUDDY_RATINGS_COLLECTION = 'buddyRatings'

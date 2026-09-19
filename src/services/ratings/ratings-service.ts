import { isValidDocumentId } from '@/lib/ids'
import { ratingRepository } from '@/repositories/repositories'
import type { CreateBuddyReviewInput } from '@/repositories/ratings/rating-repository'
import type { BuddyReview } from '@/types/buddy-rating'

const LIMIT = 100
const INVALID = 'This review could not be saved.'

export const ratingsService = {
  listByReviewedUser(userId: string): Promise<BuddyReview[]> {
    if (!isValidDocumentId(userId)) return Promise.reject(new Error(INVALID))
    return ratingRepository.listByReviewedUser(userId, LIMIT)
  },

  listByReviewer(userId: string): Promise<BuddyReview[]> {
    if (!isValidDocumentId(userId)) return Promise.reject(new Error(INVALID))
    return ratingRepository.listByReviewer(userId, LIMIT)
  },

  async create(input: CreateBuddyReviewInput, currentUserId: string): Promise<BuddyReview> {
    if (!isValidDocumentId(currentUserId) || input.reviewerId !== currentUserId) {
      throw new Error(INVALID)
    }
    if (!isValidDocumentId(input.eventId) || !isValidDocumentId(input.reviewedUserId) || input.reviewerId === input.reviewedUserId) {
      throw new Error(INVALID)
    }
    if (input.attendanceStatus === 'attended' && !input.punctuality) {
      throw new Error('Choose whether they were on time.')
    }
    return ratingRepository.create({
      ...input,
      note: input.note.trim().slice(0, 200),
    })
  },
}

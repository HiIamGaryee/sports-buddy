import type { BuddyReview, ReliabilityStats } from '@/types/buddy-rating'

export const RECENT_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

const roundRate = (numerator: number, denominator: number) =>
  denominator === 0 ? null : Math.round((numerator / denominator) * 100)

export function calculateBuddyReliability(
  reviews: readonly BuddyReview[],
  reviewedUserId: string,
  now: Date,
): ReliabilityStats {
  const relevantReviews = reviews.filter((review) => review.reviewedUserId === reviewedUserId)
  const windowStart = now.getTime() - RECENT_WINDOW_DAYS * DAY_MS
  const recentCount = relevantReviews.filter((review) => {
    const at = new Date(review.createdAt).getTime()
    return Number.isFinite(at) && at >= windowStart && at <= now.getTime()
  }).length
  const attendedCount = relevantReviews.filter((review) => review.attendanceStatus === 'attended').length
  const onTimeCount = relevantReviews.filter((review) => review.punctuality === 'on_time').length
  const lateCount = relevantReviews.filter((review) => review.punctuality === 'late').length
  const veryLateCount = relevantReviews.filter((review) => review.punctuality === 'very_late').length
  const noShowCount = relevantReviews.filter((review) => review.attendanceStatus === 'no_show').length
  const totalReviewedActivities = relevantReviews.length
  const attendanceRate = roundRate(attendedCount, totalReviewedActivities)

  return {
    totalReviewedActivities,
    recentCount,
    attendedCount,
    onTimeCount,
    lateCount,
    veryLateCount,
    noShowCount,
    attendanceRate,
    noShowRate: roundRate(noShowCount, totalReviewedActivities),
    onTimeRate: roundRate(onTimeCount, attendedCount),
    label:
      totalReviewedActivities < 3 || attendanceRate === null
        ? null
        : attendanceRate >= 95 ? 'Highly reliable'
          : attendanceRate >= 85 ? 'Reliable'
            : attendanceRate >= 70 ? 'Mixed reliability' : 'Limited reliability',
  }
}

export function canReviewActivity(
  activity: { id: string; is_done_event: 0 | 1; participantIds: readonly string[]; buddy: { id: string } },
  reviewerId: string,
  reviews: readonly BuddyReview[],
) {
  return activity.is_done_event === 1 &&
    activity.participantIds.includes(reviewerId) &&
    !reviews.some((review) => review.eventId === activity.id && review.reviewerId === reviewerId && review.reviewedUserId === activity.buddy.id)
}

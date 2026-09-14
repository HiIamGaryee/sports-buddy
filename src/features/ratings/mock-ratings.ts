import type {
  BuddyReview,
  CompletedActivity,
  ReliabilityStats,
} from '@/types/buddy-rating'

export const completedActivities = [
  {
    id: 'event-001',
    activity: 'Badminton',
    venue: 'TPP5 Badminton Court',
    date: '12 Sep 2026',
    time: '7:00 PM',
    is_done_event: 1,
    participantIds: ['current-user', 'buddy_jason'],
    buddy: { id: 'buddy_jason', name: 'Jason', avatar: null },
  },
  {
    id: 'event-002',
    activity: 'Pickleball',
    venue: 'KL Pickleball Social',
    date: '8 Sep 2026',
    time: '8:00 PM',
    is_done_event: 1,
    participantIds: ['current-user', 'buddy_mei'],
    buddy: { id: 'buddy_mei', name: 'Mei', avatar: null },
  },
  {
    id: 'event-003',
    activity: 'Running',
    venue: 'Bukit Jalil Park',
    date: '16 Sep 2026',
    time: '6:30 PM',
    is_done_event: 0,
    participantIds: ['current-user', 'buddy_daniel'],
    buddy: { id: 'buddy_daniel', name: 'Daniel', avatar: null },
  },
] as const satisfies readonly CompletedActivity[]

export const MOCK_REVIEWS: readonly BuddyReview[] = [
  {
    id: 'review-001',
    eventId: 'event-002',
    reviewerId: 'current-user',
    reviewedUserId: 'buddy_mei',
    attendanceStatus: 'attended',
    punctuality: 'on_time',
    experience: 'great',
    note: 'Friendly and arrived early.',
    createdAt: '2026-09-08T21:30:00',
  },
  {
    id: 'review-002',
    eventId: 'event-020',
    reviewerId: 'user-010',
    reviewedUserId: 'buddy_jason',
    attendanceStatus: 'no_show',
    punctuality: null,
    experience: null,
    note: '',
    createdAt: '2026-08-29T20:00:00',
  },
]

const roundRate = (numerator: number, denominator: number) =>
  denominator === 0 ? null : Math.round((numerator / denominator) * 100)

export function calculateReliability(
  reviews: readonly BuddyReview[],
  reviewedUserId: string,
): ReliabilityStats {
  const relevantReviews = reviews.filter(
    (review) => review.reviewedUserId === reviewedUserId,
  )
  const attendedCount = relevantReviews.filter(
    (review) => review.attendanceStatus === 'attended',
  ).length
  const onTimeCount = relevantReviews.filter(
    (review) => review.punctuality === 'on_time',
  ).length
  const lateCount = relevantReviews.filter(
    (review) => review.punctuality === 'late',
  ).length
  const veryLateCount = relevantReviews.filter(
    (review) => review.punctuality === 'very_late',
  ).length
  const noShowCount = relevantReviews.filter(
    (review) => review.attendanceStatus === 'no_show',
  ).length

  const totalReviewedActivities = relevantReviews.length
  const attendanceRate = roundRate(attendedCount, totalReviewedActivities)
  const noShowRate = roundRate(noShowCount, totalReviewedActivities)
  const onTimeRate = roundRate(onTimeCount, attendedCount)

  return {
    totalReviewedActivities,
    attendedCount,
    onTimeCount,
    lateCount,
    veryLateCount,
    noShowCount,
    attendanceRate,
    noShowRate,
    onTimeRate,
    label:
      totalReviewedActivities < 3 || attendanceRate === null
        ? null
        : attendanceRate >= 95
          ? 'Highly reliable'
          : attendanceRate >= 85
            ? 'Reliable'
            : attendanceRate >= 70
              ? 'Mixed reliability'
              : 'Limited reliability',
  }
}

export function canReviewActivity(
  activity: CompletedActivity,
  reviewerId: string,
  reviews: readonly BuddyReview[],
) {
  const isParticipant =
    activity.participantIds.includes(reviewerId) ||
    (activity.participantIds.includes('current-user') &&
      reviewerId !== activity.buddy.id)
  const alreadyReviewed = reviews.some(
    (review) =>
      review.eventId === activity.id &&
      review.reviewerId === reviewerId &&
      review.reviewedUserId === activity.buddy.id,
  )

  return activity.is_done_event === 1 && isParticipant && !alreadyReviewed
}

export function getReviewableActivities(
  buddyId: string,
  reviewerId: string,
  reviews: readonly BuddyReview[],
) {
  return completedActivities.filter(
    (activity) =>
      activity.buddy.id === buddyId &&
      canReviewActivity(activity, reviewerId, reviews),
  )
}

type ReviewListener = () => void
let reviews = [...MOCK_REVIEWS]
const listeners = new Set<ReviewListener>()

export const buddyReviewStore = {
  getSnapshot: () => reviews,
  subscribe(listener: ReviewListener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  submit(review: Omit<BuddyReview, 'id' | 'createdAt'>) {
    const duplicate = reviews.some(
      (entry) =>
        entry.eventId === review.eventId &&
        entry.reviewerId === review.reviewerId &&
        entry.reviewedUserId === review.reviewedUserId,
    )
    if (duplicate) throw new Error('This activity has already been reviewed.')
    const saved: BuddyReview = {
      ...review,
      id: `review-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    reviews = [...reviews, saved]
    listeners.forEach((listener) => listener())
    return saved
  },
}

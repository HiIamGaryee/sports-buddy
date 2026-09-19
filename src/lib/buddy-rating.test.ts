import { describe, expect, it } from 'vitest'

import { calculateBuddyReliability } from '@/lib/buddy-rating'
import type { BuddyReview } from '@/types/buddy-rating'

const review = (overrides: Partial<BuddyReview> = {}): BuddyReview => ({
  id: 'review-1',
  eventId: 'activity-1',
  reviewerId: 'reviewer-1',
  reviewedUserId: 'buddy-1',
  attendanceStatus: 'attended',
  punctuality: 'on_time',
  experience: 'great',
  note: '',
  createdAt: '2026-09-10T10:00:00.000Z',
  ...overrides,
})

describe('calculateBuddyReliability', () => {
  it('calculates rates only for the requested profile', () => {
    const result = calculateBuddyReliability(
      [
        review(),
        review({ id: 'review-2', attendanceStatus: 'no_show', punctuality: null, experience: null }),
        review({ id: 'review-3', reviewedUserId: 'another-buddy' }),
      ],
      'buddy-1',
      new Date('2026-09-20T10:00:00.000Z'),
    )

    expect(result.totalReviewedActivities).toBe(2)
    expect(result.attendanceRate).toBe(50)
    expect(result.noShowRate).toBe(50)
    expect(result.onTimeRate).toBe(100)
  })

  it('does not claim a reliability label before three reviews', () => {
    expect(calculateBuddyReliability([review(), review({ id: 'review-2' })], 'buddy-1', new Date('2026-09-20T10:00:00.000Z')).label).toBeNull()
  })
})

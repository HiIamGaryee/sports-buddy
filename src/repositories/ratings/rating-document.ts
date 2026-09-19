import { Timestamp, type DocumentData } from 'firebase/firestore'

import type { BuddyReview, AttendanceStatus, Experience, Punctuality } from '@/types/buddy-rating'

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

export function toBuddyReviewDocument(id: string, data: DocumentData): BuddyReview | null {
  const attendanceStatus = data.attendanceStatus
  const punctuality = data.punctuality
  const experience = data.experience
  const createdAt = data.createdAt
  if (
    !asString(data.eventId) ||
    !asString(data.reviewerId) ||
    !asString(data.reviewedUserId) ||
    data.reviewerId === data.reviewedUserId ||
    (attendanceStatus !== 'attended' && attendanceStatus !== 'no_show') ||
    (punctuality !== null && punctuality !== 'on_time' && punctuality !== 'late' && punctuality !== 'very_late') ||
    (experience !== null && experience !== 'great' && experience !== 'good' && experience !== 'okay' && experience !== 'not_great') ||
    (typeof createdAt !== 'string' && !(createdAt instanceof Timestamp))
  ) return null

  return {
    id,
    eventId: data.eventId,
    reviewerId: data.reviewerId,
    reviewedUserId: data.reviewedUserId,
    attendanceStatus: attendanceStatus as AttendanceStatus,
    punctuality: punctuality as Punctuality | null,
    experience: experience as Experience | null,
    note: asString(data.note),
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : createdAt,
  }
}

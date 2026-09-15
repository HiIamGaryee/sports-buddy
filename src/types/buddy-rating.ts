export type AttendanceStatus = 'attended' | 'no_show'
export type Punctuality = 'on_time' | 'late' | 'very_late'
export type Experience = 'great' | 'good' | 'okay' | 'not_great'

export interface BuddyReview {
  id: string
  eventId: string
  reviewerId: string
  reviewedUserId: string
  attendanceStatus: AttendanceStatus
  punctuality: Punctuality | null
  experience: Experience | null
  note: string
  createdAt: string
}

export interface CompletedActivity {
  id: string
  activity: string
  venue: string
  date: string
  time: string
  is_done_event: 0 | 1
  participantIds: readonly string[]
  buddy: {
    id: string
    name: string
    avatar: string | null
  }
}

export interface ReliabilityStats {
  totalReviewedActivities: number
  /** Reviewed activities inside the trailing window — "how active lately". */
  recentCount: number
  attendedCount: number
  onTimeCount: number
  lateCount: number
  veryLateCount: number
  noShowCount: number
  attendanceRate: number | null
  noShowRate: number | null
  onTimeRate: number | null
  label: string | null
}

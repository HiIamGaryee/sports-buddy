import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import type { AttendanceRecord } from '@/types/attendance'

const toIsoOrNull = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : typeof value === 'string' ? value : null

/**
 * Firestore document → domain object. `code` is deliberately dropped here:
 * it was only ever needed to prove the check-in at write time (verified by
 * the rules), and the domain type never carries it.
 */
export function toAttendanceRecordDocument(id: string, data: DocumentData): AttendanceRecord | null {
  if (typeof data.activityId !== 'string' || typeof data.userId !== 'string') return null
  return {
    id,
    activityId: data.activityId,
    userId: data.userId,
    checkedInAt: toIsoOrNull(data.checkedInAt),
  }
}

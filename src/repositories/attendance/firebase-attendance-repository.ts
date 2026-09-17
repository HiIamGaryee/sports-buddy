import {
  collection,
  doc,
  FirestoreError,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import { CHECK_IN_CODE_LENGTH } from '@/constants/attendance'
import { generateCheckInCode } from '@/lib/attendance'
import { toAttendanceRecordDocument } from '@/repositories/attendance/attendance-document'
import {
  ATTENDANCE_COLLECTION,
  CHECK_IN_DOC_ID,
  CHECK_IN_SUBCOLLECTION,
  type AttendanceRepository,
} from '@/repositories/attendance/attendance-repository'
import { GROUP_ACTIVITIES_COLLECTION } from '@/repositories/group-activity/group-activity-repository'
import { attendanceError, ATTENDANCE_ERROR_CODES } from '@/services/attendance/attendance-error'
import { getFirebaseDb } from '@/services/firebase/client'

const checkInRef = (activityId: string) =>
  doc(getFirebaseDb(), GROUP_ACTIVITIES_COLLECTION, activityId, CHECK_IN_SUBCOLLECTION, CHECK_IN_DOC_ID)

const attendanceRef = (activityId: string, userId: string) =>
  doc(getFirebaseDb(), ATTENDANCE_COLLECTION, `${activityId}__${userId}`)

async function writeCode(activityId: string, organizerId: string): Promise<string> {
  const code = generateCheckInCode(CHECK_IN_CODE_LENGTH)
  await setDoc(checkInRef(activityId), { organizerId, code, updatedAt: serverTimestamp() })
  return code
}

export const firebaseAttendanceRepository: AttendanceRepository = {
  async ensureCheckInCode(activityId, organizerId) {
    const snapshot = await getDoc(checkInRef(activityId))
    const existing = snapshot.exists() ? snapshot.data().code : null
    return typeof existing === 'string' && existing.length > 0
      ? existing
      : writeCode(activityId, organizerId)
  },

  regenerateCheckInCode(activityId, organizerId) {
    return writeCode(activityId, organizerId)
  },

  async checkIn(activityId, userId, code) {
    const reference = attendanceRef(activityId, userId)
    // Idempotent: a second scan never re-writes an existing record, so the
    // rules' create-only restriction is never even hit on a repeat check-in.
    const existing = await getDoc(reference)
    if (existing.exists()) {
      const record = toAttendanceRecordDocument(existing.id, existing.data())
      if (record) return record
    }
    try {
      await setDoc(reference, {
        id: reference.id,
        activityId,
        userId,
        code,
        checkedInAt: serverTimestamp(),
      })
    } catch (error) {
      // The rules refuse a wrong code, a non-participant, or an activity
      // that has not started — all read as "the code didn't work" here.
      if (error instanceof FirestoreError && error.code === 'permission-denied') {
        throw attendanceError(ATTENDANCE_ERROR_CODES.wrongCode)
      }
      throw error
    }
    return { id: reference.id, activityId, userId, checkedInAt: null }
  },

  async listByActivity(activityId, limit) {
    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), ATTENDANCE_COLLECTION),
        where('activityId', '==', activityId),
        firestoreLimit(limit),
      ),
    )
    return snapshot.docs.flatMap((entry) => {
      const record = toAttendanceRecordDocument(entry.id, entry.data())
      return record ? [record] : []
    })
  },

  async listByUser(userId, limit) {
    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), ATTENDANCE_COLLECTION),
        where('userId', '==', userId),
        firestoreLimit(limit),
      ),
    )
    return snapshot.docs.flatMap((entry) => {
      const record = toAttendanceRecordDocument(entry.id, entry.data())
      return record ? [record] : []
    })
  },
}

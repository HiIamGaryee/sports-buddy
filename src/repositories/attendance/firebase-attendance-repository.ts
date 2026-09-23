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
import { ACTIVITY_POSTS_COLLECTION } from '@/repositories/activity-post/activity-post-repository'
import { GROUP_ACTIVITIES_COLLECTION } from '@/repositories/group-activity/group-activity-repository'
import { attendanceError, ATTENDANCE_ERROR_CODES } from '@/services/attendance/attendance-error'
import { getFirebaseDb } from '@/services/firebase/client'
import type { CheckInSubjectKind } from '@/types/attendance'

/** The one place the two collection names are chosen — never a user value. */
const collectionFor = (kind: CheckInSubjectKind) =>
  kind === 'group' ? GROUP_ACTIVITIES_COLLECTION : ACTIVITY_POSTS_COLLECTION

const checkInRef = (kind: CheckInSubjectKind, activityId: string) =>
  doc(getFirebaseDb(), collectionFor(kind), activityId, CHECK_IN_SUBCOLLECTION, CHECK_IN_DOC_ID)

const attendanceRef = (activityId: string, userId: string) =>
  doc(getFirebaseDb(), ATTENDANCE_COLLECTION, `${activityId}__${userId}`)

async function writeCode(
  kind: CheckInSubjectKind,
  activityId: string,
  hostId: string,
  chosen?: string,
): Promise<string> {
  const code = chosen ?? generateCheckInCode(CHECK_IN_CODE_LENGTH)
  // `organizerId` is the stored field name for both kinds: it is the host, and
  // renaming it would migrate every existing group activity's code document.
  await setDoc(checkInRef(kind, activityId), {
    organizerId: hostId,
    code,
    updatedAt: serverTimestamp(),
  })
  return code
}

export const firebaseAttendanceRepository: AttendanceRepository = {
  async ensureCheckInCode(kind, activityId, hostId) {
    const snapshot = await getDoc(checkInRef(kind, activityId))
    const existing = snapshot.exists() ? snapshot.data().code : null
    return typeof existing === 'string' && existing.length > 0
      ? existing
      : writeCode(kind, activityId, hostId)
  },

  regenerateCheckInCode(kind, activityId, hostId) {
    return writeCode(kind, activityId, hostId)
  },

  setCheckInCode(kind, activityId, hostId, code) {
    return writeCode(kind, activityId, hostId, code)
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

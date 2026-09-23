import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { CHECK_IN_CODE_LENGTH } from '@/constants/attendance'
import { generateCheckInCode } from '@/lib/attendance'
import { delay, readStore, readStoreArray, writeStore } from '@/repositories/mock-store'
import { attendanceError, ATTENDANCE_ERROR_CODES } from '@/services/attendance/attendance-error'
import type { AttendanceRepository } from '@/repositories/attendance/attendance-repository'
import type { AttendanceRecord } from '@/types/attendance'

const isAttendanceRecord = (value: unknown): value is AttendanceRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string' && typeof record.activityId === 'string' && typeof record.userId === 'string'
}

const readRecords = () =>
  readStoreArray<AttendanceRecord>(MOCK_STORAGE_KEYS.attendanceRecords, isAttendanceRecord)

const writeRecords = (records: AttendanceRecord[]) =>
  writeStore(MOCK_STORAGE_KEYS.attendanceRecords, records)

const CHECK_IN_CODES_KEY = `${MOCK_STORAGE_KEYS.attendanceRecords}.codes`

const isCodeMap = (value: unknown): value is Record<string, string> =>
  !!value && typeof value === 'object' && Object.values(value).every((entry) => typeof entry === 'string')

const readCodes = () => readStore<Record<string, string>>(CHECK_IN_CODES_KEY, {}, isCodeMap)
const writeCodes = (codes: Record<string, string>) => writeStore(CHECK_IN_CODES_KEY, codes)

/** localStorage-backed, with the same shape and rules as Firestore. */
export const mockAttendanceRepository: AttendanceRepository = {
  async ensureCheckInCode(_kind, activityId) {
    const codes = readCodes()
    if (codes[activityId]) return delay(codes[activityId])
    const code = generateCheckInCode(CHECK_IN_CODE_LENGTH)
    writeCodes({ ...codes, [activityId]: code })
    return delay(code)
  },

  async regenerateCheckInCode(_kind, activityId) {
    const code = generateCheckInCode(CHECK_IN_CODE_LENGTH)
    writeCodes({ ...readCodes(), [activityId]: code })
    return delay(code)
  },

  async checkIn(activityId, userId, code) {
    const id = `${activityId}__${userId}`
    const records = readRecords()
    const existing = records.find((record) => record.id === id)
    if (existing) return delay(existing)

    const expected = readCodes()[activityId]
    if (!expected || expected !== code) {
      throw attendanceError(ATTENDANCE_ERROR_CODES.wrongCode)
    }

    const record: AttendanceRecord = {
      id,
      activityId,
      userId,
      checkedInAt: new Date().toISOString(),
    }
    writeRecords([...records, record])
    return delay(record)
  },

  async listByActivity(activityId, limit) {
    return delay(
      readRecords()
        .filter((record) => record.activityId === activityId)
        .slice(0, limit),
    )
  },

  async listByUser(userId, limit) {
    return delay(
      readRecords()
        .filter((record) => record.userId === userId)
        .slice(0, limit),
    )
  },
}

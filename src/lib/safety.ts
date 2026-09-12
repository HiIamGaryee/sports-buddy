import { isValidDocumentId } from '@/lib/ids'
import { BLOCK_REASONS, MAX_REPORT_NOTE_LENGTH, REPORT_REASONS, type BlockRecord, type ReportReason } from '@/types/safety'

export const createBlockId = (blockerId: string, blockedUserId: string) => `${blockerId}__${blockedUserId}`
export const canUsersInteract = (currentUserId: string, targetUserId: string, blockedIds: ReadonlySet<string>) =>
  currentUserId !== targetUserId && !blockedIds.has(targetUserId)
export const isBlockReason = (value: unknown): value is (typeof BLOCK_REASONS)[number] => typeof value === 'string' && (BLOCK_REASONS as readonly string[]).includes(value)
export const isReportReason = (value: unknown): value is ReportReason => typeof value === 'string' && (REPORT_REASONS as readonly string[]).includes(value)
export const validateReport = (reporterId: string, reportedUserId: string, reason: unknown, note: unknown) =>
  isValidDocumentId(reporterId) && isValidDocumentId(reportedUserId) && reporterId !== reportedUserId && isReportReason(reason) && (note == null || (typeof note === 'string' && note.length <= MAX_REPORT_NOTE_LENGTH))
export const blockedUserIds = (userId: string, records: readonly BlockRecord[]) => new Set(records.flatMap((record) => record.blockerId === userId ? [record.blockedUserId] : record.blockedUserId === userId ? [record.blockerId] : []))

import { isValidDocumentId } from '@/lib/ids'
import { canUsersInteract, isBlockReason, validateReport } from '@/lib/safety'
import { blockRepository, reportRepository } from '@/repositories/repositories'
import type { BlockReason, ReportReason } from '@/types/safety'
const unavailable = () => new Error('This conversation is unavailable.')
export const safetyService = {
  canUsersInteract,
  subscribe: (userId: string, onChange: (ids: string[]) => void, onError: (error: Error) => void) => blockRepository.subscribeToBlocks(userId, onChange, (e) => onError(e instanceof Error ? e : unavailable())),
  async blockUser(blockerId: string, blockedUserId: string, reason: BlockReason | null = null) { if (!isValidDocumentId(blockerId) || !isValidDocumentId(blockedUserId) || blockerId === blockedUserId || (reason !== null && !isBlockReason(reason))) throw new Error("We couldn't block this user. Please try again."); return blockRepository.blockUser({ blockerId, blockedUserId, reason }) },
  async unblockUser(blockerId: string, blockedUserId: string) { return blockRepository.unblockUser(blockerId, blockedUserId) },
  async reportUser(reporterId: string, reportedUserId: string, reason: ReportReason, note: string | null, context: { type: 'profile' | 'conversation'; connectionId?: string; conversationId?: string }) { const safeNote = note?.trim() || null; if (!validateReport(reporterId, reportedUserId, reason, safeNote)) throw new Error("We couldn't submit your report. Please try again."); return reportRepository.submitReport({ reporterId, reportedUserId, reason, note: safeNote, context }) },
  assertCanInteract(currentUserId: string, targetUserId: string, blockedIds: ReadonlySet<string>) { if (!canUsersInteract(currentUserId, targetUserId, blockedIds)) throw unavailable() },
}

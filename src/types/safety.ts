export const BLOCK_REASONS = [
  'unwanted-contact', 'inappropriate-behavior', 'spam', 'safety-concern', 'other',
] as const
export type BlockReason = (typeof BLOCK_REASONS)[number]

export const REPORT_REASONS = [
  'harassment', 'spam', 'inappropriate-content', 'fake-profile', 'safety-concern', 'other',
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]
export const MAX_REPORT_NOTE_LENGTH = 500

export interface BlockRecord {
  id: string
  blockerId: string
  blockedUserId: string
  reason: BlockReason | null
  createdAt: string | null
}

export interface SafetyReport {
  id: string
  reporterId: string
  reportedUserId: string
  reason: ReportReason
  note: string | null
  context: { type: 'profile' | 'conversation'; connectionId?: string; conversationId?: string }
  status: 'submitted'
  createdAt: string | null
}

import type { BlockReason, BlockRecord } from '@/types/safety'
export interface BlockRepository {
  blockUser(input: { blockerId: string; blockedUserId: string; reason: BlockReason | null }): Promise<BlockRecord>
  unblockUser(blockerId: string, blockedUserId: string): Promise<void>
  getBlockedUserIds(userId: string): Promise<string[]>
  subscribeToBlocks(userId: string, onChange: (ids: string[]) => void, onError: (error: unknown) => void): () => void
}
export const BLOCKS_COLLECTION = 'blocks'

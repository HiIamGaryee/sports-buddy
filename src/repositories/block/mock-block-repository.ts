import { createBlockId } from '@/lib/safety'
import { delay, readStoreArray, writeStore } from '@/repositories/mock-store'
import type { BlockRepository } from '@/repositories/block/block-repository'
import type { BlockRecord } from '@/types/safety'
const key = 'sports-buddy.mock-blocks'
const isBlockRecord = (value: unknown): value is BlockRecord => typeof value === 'object' && value !== null && typeof (value as BlockRecord).id === 'string' && typeof (value as BlockRecord).blockerId === 'string' && typeof (value as BlockRecord).blockedUserId === 'string'
const read = () => readStoreArray<BlockRecord>(key, isBlockRecord)
const listeners = new Set<{ userId: string; onChange: (ids: string[]) => void }>()
const notify = () => listeners.forEach(({ userId, onChange }) => onChange(read().flatMap((b) => b.blockerId === userId ? [b.blockedUserId] : b.blockedUserId === userId ? [b.blockerId] : [])))
export const mockBlockRepository: BlockRepository = {
  async blockUser({ blockerId, blockedUserId, reason }) { await delay(null, 80); const id = createBlockId(blockerId, blockedUserId); const existing = read().find((b) => b.id === id); if (existing) return existing; const record: BlockRecord = { id, blockerId, blockedUserId, reason, createdAt: new Date().toISOString() }; writeStore(key, [...read(), record]); notify(); return record },
  async unblockUser(blockerId, blockedUserId) { writeStore(key, read().filter((b) => b.id !== createBlockId(blockerId, blockedUserId))); notify() },
  async getBlockedUserIds(userId) { return read().flatMap((b) => b.blockerId === userId ? [b.blockedUserId] : b.blockedUserId === userId ? [b.blockerId] : []) },
  subscribeToBlocks(userId, onChange) { const listener = { userId, onChange }; listeners.add(listener); onChange(read().flatMap((b) => b.blockerId === userId ? [b.blockedUserId] : b.blockedUserId === userId ? [b.blockerId] : [])); return () => listeners.delete(listener) },
}

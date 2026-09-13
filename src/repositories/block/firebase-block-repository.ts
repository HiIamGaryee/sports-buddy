import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, where, query } from 'firebase/firestore'
import { createBlockId } from '@/lib/safety'
import { BLOCKS_COLLECTION, type BlockRepository } from '@/repositories/block/block-repository'
import { getFirebaseDb } from '@/services/firebase/client'
const records = (userId: string, docs: readonly { id: string; data: () => Record<string, unknown> }[]) => docs.flatMap((d) => { const x = d.data(); return typeof x.blockerId === 'string' && typeof x.blockedUserId === 'string' ? [x.blockerId === userId ? x.blockedUserId : x.blockedUserId === userId ? x.blockerId : ''] : [] }).filter(Boolean)
export const firebaseBlockRepository: BlockRepository = {
  async blockUser({ blockerId, blockedUserId, reason }) { const id = createBlockId(blockerId, blockedUserId); const reference = doc(getFirebaseDb(), BLOCKS_COLLECTION, id); if ((await getDoc(reference)).exists()) return { id, blockerId, blockedUserId, reason, createdAt: null }; await setDoc(reference, { blockerId, blockedUserId, reason, createdAt: serverTimestamp() }); return { id, blockerId, blockedUserId, reason, createdAt: new Date().toISOString() } },
  unblockUser(blockerId, blockedUserId) { return deleteDoc(doc(getFirebaseDb(), BLOCKS_COLLECTION, createBlockId(blockerId, blockedUserId))) },
  async getBlockedUserIds(userId) { const { getDocs } = await import('firebase/firestore'); const snapshot = await getDocs(query(collection(getFirebaseDb(), BLOCKS_COLLECTION), where('blockerId', '==', userId))); return records(userId, snapshot.docs) },
  subscribeToBlocks(userId, onChange, onError) { return onSnapshot(query(collection(getFirebaseDb(), BLOCKS_COLLECTION), where('blockerId', '==', userId)), (s) => onChange(records(userId, s.docs)), onError) },
}

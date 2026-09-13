import { useCallback, useMemo, useSyncExternalStore } from 'react'

import { useAuth } from '@/hooks/use-auth'
import {
  getReadState,
  getReadStateSnapshot,
  markConversationRead,
  subscribeToReadState,
} from '@/lib/chat-read-state'

/**
 * The signed-in user's read markers, as live React state.
 *
 * `useSyncExternalStore` rather than an effect, because the Messages list and
 * the open conversation are on screen together from `md` up: opening a thread
 * must clear its dot in the list beside it, in the same tab, immediately.
 */
export function useChatReadState() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const store = useSyncExternalStore(
    subscribeToReadState,
    getReadStateSnapshot,
    getReadStateSnapshot,
  )

  const readAt = useMemo(
    () => (userId ? getReadState(store, userId) : {}),
    [store, userId],
  )

  const markRead = useCallback(
    (conversationId: string, at: string) => {
      if (!userId) return
      markConversationRead(userId, conversationId, at)
    },
    [userId],
  )

  return { readAt, markRead }
}

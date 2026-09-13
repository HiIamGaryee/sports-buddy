import { useMemo } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { useConversationsFeed } from '@/hooks/use-conversations-feed'
import { useChatReadState } from '@/features/chat/use-chat-read-state'
import { isConversationUnread } from '@/lib/chat-read-state'

/**
 * How many conversations have a message the viewer has not opened yet — the
 * dot on the Messages tab.
 *
 * Same inputs and the same `isConversationUnread` rule as the per-row dot in
 * `useConversations`, and restricted to CONNECTED buddies exactly as the list
 * is, so the tab can never claim an unread thread the list does not show. No
 * subscription of its own: everything comes from the two providers already
 * mounted for the signed-in app.
 */
export function useUnreadConversationCount(): number {
  const { user } = useAuth()
  const { connections } = useConnections()
  const { conversations } = useConversationsFeed()
  const { readAt } = useChatReadState()
  const userId = user?.id ?? null

  return useMemo(() => {
    if (!userId) return 0
    const connectedIds = new Set(
      [...connections.values()]
        .filter((connection) => connection.status === 'connected')
        .map((connection) => connection.id),
    )
    return conversations.filter(
      (conversation) =>
        connectedIds.has(conversation.id) &&
        isConversationUnread(conversation, userId, readAt[conversation.id]),
    ).length
  }, [connections, conversations, readAt, userId])
}

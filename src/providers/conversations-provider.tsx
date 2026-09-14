import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { ConversationsContext } from '@/providers/conversations-context'
import { chatService } from '@/services/chat/chat-service'
import type { Conversation } from '@/types/chat'

interface ConversationsState {
  userId: string | null
  conversations: Conversation[]
  error: string
}

const initialState = (userId: string | null): ConversationsState => ({
  userId,
  conversations: [],
  error: '',
})

/**
 * The ONE conversations subscription (`participants array-contains uid`).
 *
 * It lives here rather than inside the Messages list because two things now
 * need it at the same time: the list itself, and the unread dot on the
 * Messages tab, which is visible on every screen. Subscribing in each would
 * open a second Firestore listener for the same data — the chat design allows
 * exactly one conversations listener and one open-conversation messages
 * listener, and nothing else.
 *
 * Mounted in `ProtectedRoute` beside `ConnectionProvider`, so it never runs on
 * the auth or onboarding screens. Messages themselves are still NOT held here
 * — they belong to the one open conversation.
 */
export function ConversationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ConversationsState>(() =>
    initialState(userId),
  )

  // Reset during render when the signed-in user changes — no effect needed.
  if (state.userId !== userId) setState(initialState(userId))

  useEffect(() => {
    if (!userId) return

    let active = true
    const unsubscribe = chatService.subscribeToConversations(
      userId,
      (loaded) => {
        if (active) setState({ userId, conversations: loaded, error: '' })
      },
      (subscriptionError) => {
        if (active) {
          setState((current) => ({
            ...current,
            error: subscriptionError.message,
          }))
        }
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [userId])

  const value = useMemo(
    () => ({ conversations: state.conversations, error: state.error }),
    [state.conversations, state.error],
  )

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  )
}

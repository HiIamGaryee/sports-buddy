import { useContext } from 'react'

import { ConversationsContext } from '@/providers/conversations-context'

export function useConversationsFeed() {
  const context = useContext(ConversationsContext)
  if (!context) {
    throw new Error(
      'useConversationsFeed must be used inside <ConversationsProvider>',
    )
  }
  return context
}

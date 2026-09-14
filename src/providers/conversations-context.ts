import { createContext } from 'react'

import type { Conversation } from '@/types/chat'

export interface ConversationsContextValue {
  /** The signed-in user's conversation documents, from ONE subscription. */
  conversations: Conversation[]
  error: string
}

export const ConversationsContext =
  createContext<ConversationsContextValue | null>(null)

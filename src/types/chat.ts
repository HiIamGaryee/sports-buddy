/**
 * A conversation exists only for a CONNECTED pair, and its id is the STEP 8
 * `connectionId`, so authorization is a single lookup at
 * `connections/{conversationId}` — no second pair-id system.
 */
export interface Conversation {
  /** Always equal to `connectionId`. */
  id: string
  connectionId: string
  /** Exactly the connection's participants, sorted. Immutable after create. */
  participants: [string, string]
  /** Denormalized preview for the conversation list — never a profile copy. */
  lastMessageText: string | null
  lastMessageSenderId: string | null
  /** ISO strings in the domain; Firestore timestamps stay in the repository. */
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * An immutable text event. `createdAt` is `null` for the instant between a
 * local write and the server resolving `serverTimestamp()`, so every consumer
 * must tolerate it.
 */
export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string | null
}

/** One page of history, always oldest → newest. */
export interface MessagePage {
  messages: ChatMessage[]
  hasMore: boolean
}

/** What the service hands the repository once the relationship is verified. */
export interface EnsureConversationInput {
  connectionId: string
  participants: [string, string]
}

export interface SendMessageInput {
  conversationId: string
  senderId: string
  /** Already trimmed and validated by the service. */
  content: string
}

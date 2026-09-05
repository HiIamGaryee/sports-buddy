import type {
  ChatMessage,
  Conversation,
  EnsureConversationInput,
  MessagePage,
  SendMessageInput,
} from '@/types/chat'

/**
 * Chat persistence. The repository owns queries, pagination cursors, realtime
 * plumbing and the atomicity of a send; the service owns the rules
 * (authorization and content validation).
 *
 * Both subscriptions are scoped: one to the signed-in user's own
 * conversations, one to the recent messages of a single open conversation.
 * There is never a listener on a whole history or a whole collection.
 */
export interface ChatRepository {
  /**
   * Creates `conversations/{connectionId}` only if it is missing, and returns
   * whatever now exists. Safe to call on every open.
   */
  ensureConversation(input: EnsureConversationInput): Promise<Conversation>

  /** Scoped to `participants array-contains userId`. Returns an unsubscribe. */
  subscribeToConversations(
    userId: string,
    onChange: (conversations: Conversation[]) => void,
    onError: (error: unknown) => void,
  ): () => void

  /**
   * The newest `MESSAGE_PAGE_SIZE` messages of one conversation, delivered
   * oldest → newest. This is the only message listener.
   */
  subscribeToRecentMessages(
    conversationId: string,
    onChange: (page: MessagePage) => void,
    onError: (error: unknown) => void,
  ): () => void

  /**
   * One page of history strictly older than `beforeMessageId`. The cursor is
   * a message id, so no Firestore snapshot ever leaves this layer.
   */
  loadOlderMessages(
    conversationId: string,
    beforeMessageId: string,
  ): Promise<MessagePage>

  /**
   * Writes the message AND the conversation preview as one atomic operation,
   * so the conversation list can never disagree with the history.
   */
  sendMessage(input: SendMessageInput): Promise<ChatMessage>
}

export const CONVERSATIONS_COLLECTION = 'conversations'
export const MESSAGES_SUBCOLLECTION = 'messages'

/**
 * A user has at most one conversation per connected buddy, so this is a
 * generous ceiling. Ordering happens client-side (the list is merged with
 * connected buddies who have no conversation yet), which is also why the
 * query needs no composite index.
 */
export const CONVERSATION_BATCH_LIMIT = 100

import { canChat, getMessageError, normalizeMessageContent } from '@/lib/chat'
import { chatRepository } from '@/repositories/repositories'
import {
  CHAT_ERROR_CODES,
  CHAT_FALLBACK_MESSAGES,
  chatError,
  toChatError,
} from '@/services/chat/chat-error'
import type { ChatMessage, Conversation, MessagePage } from '@/types/chat'
import type { Connection } from '@/types/connection'

/**
 * The domain rules for chat: who may talk, and what counts as a message.
 * No React state, no Firebase.
 *
 * Chat and connection stay separate systems. This service never performs a
 * connection transition, and `connectionService` never touches a message. The
 * only thing crossing the line is the pure `canChat()` check, which reuses
 * STEP 8's `getConnectionState()` rather than re-deriving it.
 *
 * The relationship is the permission, so every guarded call takes a
 * `Connection` rather than a bare user id — there is deliberately no
 * `createConversation(someUserId)`. Firestore rules enforce the same rule
 * server-side by reading `connections/{conversationId}`.
 */
function assertCanChat(
  connection: Connection | null | undefined,
  currentUserId: string,
) {
  if (!canChat(connection, currentUserId)) {
    throw chatError(CHAT_ERROR_CODES.notConnected)
  }
}

export const chatService = {
  canChat,

  /**
   * Lazy and idempotent: a conversation document is created the first time a
   * connected pair actually opens the chat, never for every connection.
   * `conversationId === connection.id`, so no second pair-id system exists.
   */
  async openConversation(
    connection: Connection | null | undefined,
    currentUserId: string,
  ): Promise<Conversation> {
    try {
      assertCanChat(connection, currentUserId)
      // Non-null by the assertion above.
      const verified = connection as Connection
      return await chatRepository.ensureConversation({
        connectionId: verified.id,
        participants: verified.participants,
      })
    } catch (error) {
      throw toChatError(error, CHAT_FALLBACK_MESSAGES.open)
    }
  },

  subscribeToConversations(
    userId: string,
    onChange: (conversations: Conversation[]) => void,
    onError: (error: Error) => void,
  ) {
    return chatRepository.subscribeToConversations(userId, onChange, (error) =>
      onError(toChatError(error, CHAT_FALLBACK_MESSAGES.load)),
    )
  },

  subscribeToRecentMessages(
    conversationId: string,
    onChange: (page: MessagePage) => void,
    onError: (error: Error) => void,
  ) {
    return chatRepository.subscribeToRecentMessages(
      conversationId,
      onChange,
      (error) => onError(toChatError(error, CHAT_FALLBACK_MESSAGES.load)),
    )
  },

  async loadOlderMessages(
    conversationId: string,
    beforeMessageId: string,
  ): Promise<MessagePage> {
    try {
      return await chatRepository.loadOlderMessages(
        conversationId,
        beforeMessageId,
      )
    } catch (error) {
      throw toChatError(error, CHAT_FALLBACK_MESSAGES.load)
    }
  },

  /**
   * Validates the relationship AND the content before anything is written, so
   * a blank or oversized message never reaches Firestore. The conversation is
   * addressed through the connection, so a caller cannot send into a
   * conversation they are not part of.
   */
  async sendMessage(
    connection: Connection | null | undefined,
    currentUserId: string,
    rawContent: string,
  ): Promise<ChatMessage> {
    try {
      assertCanChat(connection, currentUserId)
      const verified = connection as Connection

      const content = normalizeMessageContent(rawContent)
      const problem = getMessageError(content)
      if (problem) {
        throw chatError(
          content.length === 0
            ? CHAT_ERROR_CODES.empty
            : CHAT_ERROR_CODES.tooLong,
        )
      }

      return await chatRepository.sendMessage({
        conversationId: verified.id,
        senderId: currentUserId,
        content,
        participants: verified.participants,
      })
    } catch (error) {
      throw toChatError(error, CHAT_FALLBACK_MESSAGES.send)
    }
  },
}

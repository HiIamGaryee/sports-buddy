import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { MESSAGE_PAGE_SIZE } from '@/constants/chat'
import { compareMessages } from '@/lib/chat'
import type { ChatRepository } from '@/repositories/chat/chat-repository'
import { buildSeededChat } from '@/repositories/chat/mock-conversations'
import { delay, readStoreRecord, writeStore } from '@/repositories/mock-store'
import type { ChatMessage, Conversation, MessagePage } from '@/types/chat'

interface MockChatStore {
  seededUserIds: string[]
  conversations: Conversation[]
  messages: ChatMessage[]
}

const EMPTY_STORE: MockChatStore = {
  seededUserIds: [],
  conversations: [],
  messages: [],
}

const readMockStore = () =>
  readStoreRecord<MockChatStore>(MOCK_STORAGE_KEYS.chat, EMPTY_STORE)

const writeMockStore = (store: MockChatStore) =>
  writeStore(MOCK_STORAGE_KEYS.chat, store)

/** Seeds once per mock account, so a cleared thread does not come back. */
function ensureSeeded(currentUserId: string): MockChatStore {
  const store = readMockStore()
  if (store.seededUserIds.includes(currentUserId)) return store

  const seeded = buildSeededChat(currentUserId)
  const existingIds = store.conversations.map((entry) => entry.id)
  const next: MockChatStore = {
    seededUserIds: [...store.seededUserIds, currentUserId],
    conversations: [
      ...store.conversations,
      ...seeded.conversations.filter(
        (entry) => !existingIds.includes(entry.id),
      ),
    ],
    messages: [
      ...store.messages,
      ...seeded.messages.filter(
        (entry) => !existingIds.includes(entry.conversationId),
      ),
    ],
  }
  writeMockStore(next)
  return next
}

/** Oldest → newest, the same order the UI renders. */
const messagesIn = (store: MockChatStore, conversationId: string) =>
  store.messages
    .filter((message) => message.conversationId === conversationId)
    .sort(compareMessages)

const recentPage = (store: MockChatStore, conversationId: string): MessagePage => {
  const all = messagesIn(store, conversationId)
  return {
    messages: all.slice(-MESSAGE_PAGE_SIZE),
    hasMore: all.length > MESSAGE_PAGE_SIZE,
  }
}

interface ConversationListener {
  userId: string
  onChange: (conversations: Conversation[]) => void
}

interface MessageListener {
  conversationId: string
  onChange: (page: MessagePage) => void
}

const conversationListeners = new Set<ConversationListener>()
const messageListeners = new Set<MessageListener>()

/** Mirrors the Firebase subscriptions: every write re-emits to every reader. */
function notify() {
  const store = readMockStore()
  conversationListeners.forEach((listener) =>
    listener.onChange(
      store.conversations.filter((conversation) =>
        conversation.participants.includes(listener.userId),
      ),
    ),
  )
  messageListeners.forEach((listener) =>
    listener.onChange(recentPage(store, listener.conversationId)),
  )
}

let messageCounter = 0

const nextMessageId = () => {
  messageCounter += 1
  return `msg_${Date.now().toString(36)}_${messageCounter.toString(36)}`
}

export const mockChatRepository: ChatRepository = {
  /** Idempotent: seeding is the subscription's job, creation happens once. */
  async ensureConversation({ connectionId, participants }) {
    await delay(null, 150)
    const store = readMockStore()
    const existing = store.conversations.find(
      (conversation) => conversation.id === connectionId,
    )
    if (existing) return existing

    const now = new Date().toISOString()
    const created: Conversation = {
      id: connectionId,
      connectionId,
      participants,
      lastMessageText: null,
      lastMessageSenderId: null,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
    }
    writeMockStore({
      ...store,
      conversations: [...store.conversations, created],
    })
    notify()
    return created
  },

  subscribeToConversations(userId, onChange) {
    const listener: ConversationListener = { userId, onChange }
    conversationListeners.add(listener)
    const store = ensureSeeded(userId)
    onChange(
      store.conversations.filter((conversation) =>
        conversation.participants.includes(userId),
      ),
    )
    return () => conversationListeners.delete(listener)
  },

  subscribeToRecentMessages(conversationId, onChange) {
    const listener: MessageListener = { conversationId, onChange }
    messageListeners.add(listener)
    onChange(recentPage(readMockStore(), conversationId))
    return () => messageListeners.delete(listener)
  },

  async loadOlderMessages(conversationId, beforeMessageId) {
    await delay(null, 250)
    const all = messagesIn(readMockStore(), conversationId)
    const index = all.findIndex((message) => message.id === beforeMessageId)
    if (index <= 0) return { messages: [], hasMore: false }

    const start = Math.max(0, index - MESSAGE_PAGE_SIZE)
    return { messages: all.slice(start, index), hasMore: start > 0 }
  },

  async sendMessage({ conversationId, senderId, content }) {
    await delay(null, 200)
    const store = readMockStore()
    const sentAt = new Date().toISOString()
    const message: ChatMessage = {
      id: nextMessageId(),
      conversationId,
      senderId,
      content,
      createdAt: sentAt,
    }

    // Message and conversation preview move together, like the Firebase batch.
    writeMockStore({
      ...store,
      messages: [...store.messages, message],
      conversations: store.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastMessageText: content,
              lastMessageSenderId: senderId,
              lastMessageAt: sentAt,
              updatedAt: sentAt,
            }
          : conversation,
      ),
    })
    notify()
    return message
  },
}

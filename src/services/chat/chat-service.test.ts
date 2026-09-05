import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_MESSAGE_LENGTH, MESSAGE_PAGE_SIZE } from '@/constants/chat'
import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import { chatService } from '@/services/chat/chat-service'
import type { ChatMessage, Conversation, MessagePage } from '@/types/chat'
import type { Connection } from '@/types/connection'

/**
 * The chat domain end to end through the mock repository — the same one the
 * app uses with `VITE_DATA_SOURCE=mock`, so these cover the service rules,
 * mock realtime and mock persistence in one pass.
 */
const GARY = 'gary'
const AINA = 'aina'
const STRANGER = 'stranger'

const storage = new Map<string, string>()

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  })
})

beforeEach(() => storage.clear())

const connection = (overrides: Partial<Connection> = {}): Connection => ({
  id: createConnectionId(GARY, AINA),
  participants: sortConnectionPair(GARY, AINA),
  requestedBy: sortConnectionPair(GARY, AINA),
  status: 'connected',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  connectedAt: '2026-09-01T09:00:00.000Z',
  ...overrides,
})

const pending = () =>
  connection({ requestedBy: [GARY], status: 'pending', connectedAt: null })

/** What a fresh app load would see — nothing is held in memory. */
function loadConversations(userId: string): Conversation[] {
  let loaded: Conversation[] = []
  const unsubscribe = chatService.subscribeToConversations(
    userId,
    (conversations) => {
      loaded = conversations
    },
    () => {},
  )
  unsubscribe()
  return loaded
}

function loadRecent(conversationId: string): MessagePage {
  let page: MessagePage = { messages: [], hasMore: false }
  const unsubscribe = chatService.subscribeToRecentMessages(
    conversationId,
    (loaded) => {
      page = loaded
    },
    () => {},
  )
  unsubscribe()
  return page
}

/** Ignores the seeded mock threads, which belong to other pairs. */
const hasConversationForPair = (userId: string) =>
  loadConversations(userId).some(
    (entry) => entry.id === createConnectionId(GARY, AINA),
  )

describe('conversation access', () => {
  it('lets a connected pair chat, from either side', () => {
    expect(chatService.canChat(connection(), GARY)).toBe(true)
    expect(chatService.canChat(connection(), AINA)).toBe(true)
  })

  it('refuses a pending connection in either direction', async () => {
    expect(chatService.canChat(pending(), GARY)).toBe(false)
    expect(chatService.canChat(pending(), AINA)).toBe(false)

    await expect(
      chatService.openConversation(pending(), GARY),
    ).rejects.toThrow(/connected with/i)
    await expect(
      chatService.openConversation(pending(), AINA),
    ).rejects.toThrow(/connected with/i)
  })

  it('refuses a user who is not a participant', async () => {
    await expect(
      chatService.openConversation(connection(), STRANGER),
    ).rejects.toThrow(/connected with/i)
  })

  it('refuses when there is no connection at all', async () => {
    await expect(chatService.openConversation(null, GARY)).rejects.toThrow(
      /connected with/i,
    )
    expect(hasConversationForPair(GARY)).toBe(false)
  })

  it('writes nothing when access is refused', async () => {
    await expect(
      chatService.openConversation(pending(), GARY),
    ).rejects.toThrow()
    // Seeded mock threads are unrelated to this pair.
    expect(hasConversationForPair(GARY)).toBe(false)
  })
})

describe('openConversation', () => {
  it('uses the connection id as the conversation id', async () => {
    const conversation = await chatService.openConversation(connection(), GARY)
    expect(conversation.id).toBe(createConnectionId(GARY, AINA))
    expect(conversation.id).toBe(connection().id)
    expect(conversation.connectionId).toBe(conversation.id)
  })

  it('carries exactly the connection participants', async () => {
    const conversation = await chatService.openConversation(connection(), GARY)
    expect(conversation.participants).toEqual(sortConnectionPair(GARY, AINA))
  })

  it('starts with no message preview', async () => {
    const conversation = await chatService.openConversation(connection(), GARY)
    expect(conversation.lastMessageText).toBeNull()
    expect(conversation.lastMessageSenderId).toBeNull()
    expect(conversation.lastMessageAt).toBeNull()
  })

  it('is idempotent — opening repeatedly creates one document', async () => {
    const first = await chatService.openConversation(connection(), GARY)
    const second = await chatService.openConversation(connection(), AINA)
    const third = await chatService.openConversation(connection(), GARY)

    expect(second).toEqual(first)
    expect(third).toEqual(first)
    expect(
      loadConversations(GARY).filter((entry) => entry.id === first.id),
    ).toHaveLength(1)
  })

  it('is visible to both participants', async () => {
    await chatService.openConversation(connection(), GARY)
    expect(loadConversations(GARY).map((entry) => entry.id)).toContain(
      connection().id,
    )
    expect(loadConversations(AINA).map((entry) => entry.id)).toContain(
      connection().id,
    )
  })
})

describe('sendMessage', () => {
  const conversationId = createConnectionId(GARY, AINA)

  beforeEach(async () => {
    await chatService.openConversation(connection(), GARY)
  })

  it('stores a valid message', async () => {
    const message = await chatService.sendMessage(
      connection(),
      GARY,
      'Badminton Saturday?',
    )
    expect(message.content).toBe('Badminton Saturday?')
    expect(message.senderId).toBe(GARY)
    expect(message.conversationId).toBe(conversationId)
    expect(message.id).toBeTruthy()
  })

  it('trims content before storing it', async () => {
    const message = await chatService.sendMessage(
      connection(),
      GARY,
      '   Saturday works  \n',
    )
    expect(message.content).toBe('Saturday works')
  })

  it('rejects blank and whitespace-only messages', async () => {
    await expect(
      chatService.sendMessage(connection(), GARY, ''),
    ).rejects.toThrow(/type a message/i)
    await expect(
      chatService.sendMessage(connection(), GARY, '    '),
    ).rejects.toThrow(/type a message/i)
    await expect(
      chatService.sendMessage(connection(), GARY, '\n\n'),
    ).rejects.toThrow(/type a message/i)

    expect(loadRecent(conversationId).messages).toHaveLength(0)
  })

  it('rejects a message over the length limit', async () => {
    await expect(
      chatService.sendMessage(
        connection(),
        GARY,
        'x'.repeat(MAX_MESSAGE_LENGTH + 1),
      ),
    ).rejects.toThrow(new RegExp(`${MAX_MESSAGE_LENGTH} characters`))
    expect(loadRecent(conversationId).messages).toHaveLength(0)
  })

  it('accepts a message at exactly the limit', async () => {
    const message = await chatService.sendMessage(
      connection(),
      GARY,
      'x'.repeat(MAX_MESSAGE_LENGTH),
    )
    expect(message.content).toHaveLength(MAX_MESSAGE_LENGTH)
  })

  it('refuses to send on a pending connection', async () => {
    await expect(
      chatService.sendMessage(pending(), GARY, 'hello'),
    ).rejects.toThrow(/connected with/i)
    expect(loadRecent(conversationId).messages).toHaveLength(0)
  })

  it('refuses to send as somebody outside the connection', async () => {
    await expect(
      chatService.sendMessage(connection(), STRANGER, 'hello'),
    ).rejects.toThrow(/connected with/i)
    expect(loadRecent(conversationId).messages).toHaveLength(0)
  })

  /**
   * The composer clears only on a resolved send, so a rejection is what keeps
   * the user's text on screen. Nothing must reach storage either.
   */
  it('leaves nothing behind when a send is rejected', async () => {
    await expect(
      chatService.sendMessage(connection(), GARY, '   '),
    ).rejects.toThrow()
    const conversation = loadConversations(GARY)[0]
    expect(conversation.lastMessageText).toBeNull()
    expect(loadRecent(conversationId).messages).toHaveLength(0)
  })

  it('updates the conversation preview atomically with the message', async () => {
    await chatService.sendMessage(connection(), GARY, 'Saturday evening?')
    const conversation = loadConversations(GARY)[0]

    expect(conversation.lastMessageText).toBe('Saturday evening?')
    expect(conversation.lastMessageSenderId).toBe(GARY)
    expect(conversation.lastMessageAt).not.toBeNull()
    expect(loadRecent(conversationId).messages).toHaveLength(1)
  })

  it('reaches the other participant', async () => {
    await chatService.sendMessage(connection(), AINA, 'Works for me.')
    expect(loadConversations(GARY)[0].lastMessageText).toBe('Works for me.')
    expect(loadRecent(conversationId).messages[0].senderId).toBe(AINA)
  })

  it('notifies an open subscription without a refetch', async () => {
    const seen: MessagePage[] = []
    const unsubscribe = chatService.subscribeToRecentMessages(
      conversationId,
      (page) => seen.push(page),
      () => {},
    )

    await chatService.sendMessage(connection(), AINA, 'Realtime, please.')
    unsubscribe()

    const latest = seen[seen.length - 1]
    expect(seen.length).toBeGreaterThan(1)
    expect(latest.messages.at(-1)?.content).toBe('Realtime, please.')
  })

  it('stops delivering after unsubscribe', async () => {
    const seen: MessagePage[] = []
    const unsubscribe = chatService.subscribeToRecentMessages(
      conversationId,
      (page) => seen.push(page),
      () => {},
    )
    unsubscribe()
    await chatService.sendMessage(connection(), GARY, 'After unsubscribe')

    expect(seen).toHaveLength(1)
    expect(seen[0].messages).toHaveLength(0)
  })
})

describe('pagination', () => {
  const conversationId = createConnectionId(GARY, AINA)
  const TOTAL = MESSAGE_PAGE_SIZE + 5
  /** Seeding sends TOTAL messages through the mock's async delay. */
  const PAGINATION_TIMEOUT_MS = 30_000

  async function seedMessages() {
    await chatService.openConversation(connection(), GARY)
    for (let index = 0; index < TOTAL; index += 1) {
      await chatService.sendMessage(
        connection(),
        index % 2 === 0 ? GARY : AINA,
        `message ${index}`,
      )
    }
  }

  it('returns only the newest page, oldest first, with hasMore set', async () => {
    await seedMessages()
    const page = loadRecent(conversationId)

    expect(page.messages).toHaveLength(MESSAGE_PAGE_SIZE)
    expect(page.hasMore).toBe(true)
    expect(page.messages[0].content).toBe(`message ${TOTAL - MESSAGE_PAGE_SIZE}`)
    expect(page.messages.at(-1)?.content).toBe(`message ${TOTAL - 1}`)
  }, PAGINATION_TIMEOUT_MS)

  it('loads the remaining history and reports no more', async () => {
    await seedMessages()
    const recent = loadRecent(conversationId)
    const older = await chatService.loadOlderMessages(
      conversationId,
      recent.messages[0].id,
    )

    expect(older.messages).toHaveLength(TOTAL - MESSAGE_PAGE_SIZE)
    expect(older.hasMore).toBe(false)
    expect(older.messages[0].content).toBe('message 0')
  }, PAGINATION_TIMEOUT_MS)

  it('never overlaps the page it came from', async () => {
    await seedMessages()
    const recent = loadRecent(conversationId)
    const older = await chatService.loadOlderMessages(
      conversationId,
      recent.messages[0].id,
    )

    const recentIds = new Set(recent.messages.map((entry) => entry.id))
    expect(
      older.messages.some((entry) => recentIds.has(entry.id)),
    ).toBe(false)

    const allIds = [...older.messages, ...recent.messages].map(
      (entry) => entry.id,
    )
    expect(new Set(allIds).size).toBe(TOTAL)
  }, PAGINATION_TIMEOUT_MS)

  it('reports no more history at the very beginning', async () => {
    await seedMessages()
    const recent = loadRecent(conversationId)
    const older = await chatService.loadOlderMessages(
      conversationId,
      recent.messages[0].id,
    )
    const beyond = await chatService.loadOlderMessages(
      conversationId,
      older.messages[0].id,
    )

    expect(beyond.messages).toHaveLength(0)
    expect(beyond.hasMore).toBe(false)
  }, PAGINATION_TIMEOUT_MS)

  it('has no more history when the whole thread fits in one page', async () => {
    await chatService.openConversation(connection(), GARY)
    await chatService.sendMessage(connection(), GARY, 'only message')

    expect(loadRecent(conversationId).hasMore).toBe(false)
  })
})

describe('mock persistence', () => {
  const conversationId = createConnectionId(GARY, AINA)

  it('keeps a conversation and its messages across a reload', async () => {
    await chatService.openConversation(connection(), GARY)
    await chatService.sendMessage(connection(), GARY, 'Still here?')

    // A fresh read is exactly what a refresh does.
    const messages: ChatMessage[] = loadRecent(conversationId).messages
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Still here?')
    expect(loadConversations(GARY)[0].lastMessageText).toBe('Still here?')
  })

  it('seeds a thread long enough to paginate for a mock account', () => {
    const conversations = loadConversations('user_demo_001')
    const withHistory = conversations.find(
      (entry) => entry.id === createConnectionId('user_demo_001', 'buddy_mei'),
    )

    expect(withHistory).toBeDefined()
    expect(loadRecent(withHistory?.id ?? '').hasMore).toBe(true)
  })

  it('seeds nothing for a buddy who has never been messaged', () => {
    const conversations = loadConversations('user_demo_001')
    const chloe = createConnectionId('user_demo_001', 'buddy_chloe')
    expect(conversations.some((entry) => entry.id === chloe)).toBe(false)
  })
})

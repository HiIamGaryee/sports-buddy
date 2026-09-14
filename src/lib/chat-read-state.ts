import { CHAT_READ_STATE_KEY } from '@/constants/app'
import { readStore, writeStore } from '@/lib/storage'
import type { Conversation } from '@/types/chat'

/**
 * Per-viewer "what have I already seen" state for chat.
 *
 * DELIBERATELY DEVICE-LOCAL for now: this is `localStorage`, not Firestore,
 * so it needs no schema change, no security rule and no extra read. The cost
 * is honest and known — a user on two devices has two read states, and
 * clearing site data clears it.
 *
 * Everything that decides whether something is unread lives behind this
 * module's small surface (`getReadState`, `markConversationRead`,
 * `isConversationUnread`), so moving read state to
 * `conversations/{id}.lastReadAt[uid]` later changes THIS FILE and nothing
 * that renders. That is the whole reason the UI never touches storage
 * directly.
 *
 * Keyed by user id, because two accounts sharing a browser (exactly what
 * two-user testing does) must not share read state.
 */

/** `{ [userId]: { [conversationId]: ISO timestamp } }` */
type ReadStateStore = Record<string, Record<string, string>>

const isReadStateStore = (value: unknown): value is ReadStateStore => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every(
    (perUser) =>
      !!perUser &&
      typeof perUser === 'object' &&
      !Array.isArray(perUser) &&
      Object.values(perUser).every((at) => typeof at === 'string'),
  )
}

const readAll = (): ReadStateStore =>
  readStore<ReadStateStore>(CHAT_READ_STATE_KEY, {}, isReadStateStore)

/**
 * Listeners, so the Messages list and the nav badge update the moment a
 * conversation is opened — on a tablet or desktop both are on screen at once,
 * and `localStorage` fires no event in the tab that wrote it.
 */
const listeners = new Set<() => void>()

/** A stable snapshot, so `useSyncExternalStore` does not loop on a new object. */
let snapshot: ReadStateStore = readAll()

const notify = () => {
  snapshot = readAll()
  for (const listener of listeners) listener()
}

export function subscribeToReadState(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getReadStateSnapshot = (): ReadStateStore => snapshot

/** `conversationId → ISO timestamp` for one user. */
export const getReadState = (
  store: ReadStateStore,
  userId: string,
): Record<string, string> => store[userId] ?? {}

export function markConversationRead(
  userId: string,
  conversationId: string,
  at: string,
) {
  const store = readAll()
  const forUser = store[userId] ?? {}
  // Never move the marker backwards: a stale "read up to" would resurrect a
  // message the user has already seen.
  if (forUser[conversationId] && forUser[conversationId] >= at) return

  writeStore(CHAT_READ_STATE_KEY, {
    ...store,
    [userId]: { ...forUser, [conversationId]: at },
  })
  notify()
}

/**
 * Pure, so it is testable without storage and identical whatever backs the
 * read state later.
 *
 * Your OWN last message is never unread, a conversation with no messages is
 * never unread, and a conversation never opened counts as unread only once
 * somebody has actually said something.
 */
export function isConversationUnread(
  conversation: Pick<Conversation, 'lastMessageAt' | 'lastMessageSenderId'>,
  currentUserId: string,
  lastReadAt: string | undefined,
): boolean {
  const { lastMessageAt, lastMessageSenderId } = conversation
  if (!lastMessageAt) return false
  if (lastMessageSenderId === currentUserId) return false
  if (!lastReadAt) return true
  return lastMessageAt > lastReadAt
}

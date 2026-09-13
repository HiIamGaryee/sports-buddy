import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type QuerySnapshot,
} from 'firebase/firestore'

import { MESSAGE_PAGE_SIZE } from '@/constants/chat'
import {
  toConversationDocument,
  toMessageDocument,
} from '@/repositories/chat/chat-document'
import {
  CONVERSATIONS_COLLECTION,
  CONVERSATION_BATCH_LIMIT,
  MESSAGES_SUBCOLLECTION,
  type ChatRepository,
} from '@/repositories/chat/chat-repository'
import { getFirebaseDb } from '@/services/firebase/client'
import type { ChatMessage, Conversation, MessagePage } from '@/types/chat'

const conversationRef = (db: Firestore, conversationId: string) =>
  doc(db, CONVERSATIONS_COLLECTION, conversationId)

const messagesRef = (db: Firestore, conversationId: string) =>
  collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    MESSAGES_SUBCOLLECTION,
  )

/** Newest-first from Firestore → oldest-first for the UI, in one place. */
function toMessagePage(
  conversationId: string,
  snapshot: QuerySnapshot,
): MessagePage {
  const messages = snapshot.docs.flatMap((entry) => {
    const message = toMessageDocument(entry.id, conversationId, entry.data())
    return message ? [message] : []
  })
  return {
    messages: messages.reverse(),
    // A full page means there is probably another one behind it.
    hasMore: snapshot.size === MESSAGE_PAGE_SIZE,
  }
}

export const firebaseChatRepository: ChatRepository = {
  /** A transaction, so two devices opening the chat at once create one document. */
  ensureConversation({ connectionId, participants }) {
    const db = getFirebaseDb()
    const reference = conversationRef(db, connectionId)

    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      const existing = snapshot.exists()
        ? toConversationDocument(snapshot.id, snapshot.data())
        : null
      if (existing) return existing

      transaction.set(reference, {
        id: connectionId,
        connectionId,
        participants,
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const now = new Date().toISOString()
      return {
        id: connectionId,
        connectionId,
        participants,
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageAt: null,
        createdAt: now,
        updatedAt: now,
      } satisfies Conversation
    })
  },

  subscribeToConversations(userId, onChange, onError) {
    // Scoped to this user. No `orderBy`, so no composite index is needed —
    // the list is sorted client-side after merging with connected buddies
    // who have no conversation yet.
    return onSnapshot(
      query(
        collection(getFirebaseDb(), CONVERSATIONS_COLLECTION),
        where('participants', 'array-contains', userId),
        firestoreLimit(CONVERSATION_BATCH_LIMIT),
      ),
      (snapshot) =>
        onChange(
          snapshot.docs.flatMap((entry) => {
            const conversation = toConversationDocument(entry.id, entry.data())
            return conversation ? [conversation] : []
          }),
        ),
      onError,
    )
  },

  subscribeToRecentMessages(conversationId, onChange, onError) {
    // Recent messages only. Never the whole history.
    return onSnapshot(
      query(
        messagesRef(getFirebaseDb(), conversationId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(MESSAGE_PAGE_SIZE),
      ),
      (snapshot) => onChange(toMessagePage(conversationId, snapshot)),
      onError,
    )
  },

  async loadOlderMessages(conversationId, beforeMessageId) {
    const db = getFirebaseDb()
    const cursor = await getDoc(
      doc(
        db,
        CONVERSATIONS_COLLECTION,
        conversationId,
        MESSAGES_SUBCOLLECTION,
        beforeMessageId,
      ),
    )
    if (!cursor.exists()) return { messages: [], hasMore: false }

    const snapshot = await getDocs(
      query(
        messagesRef(db, conversationId),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        firestoreLimit(MESSAGE_PAGE_SIZE),
      ),
    )
    return toMessagePage(conversationId, snapshot)
  },

  /**
   * One batch: the immutable message plus the conversation preview. If either
   * write were separate, the conversation list could show a preview for a
   * message that does not exist (or miss one that does).
   */
  async sendMessage({ conversationId, senderId, content, participants }) {
    const db = getFirebaseDb()
    const reference: DocumentReference = doc(messagesRef(db, conversationId))

    const batch = writeBatch(db)
    batch.set(reference, {
      id: reference.id,
      conversationId,
      senderId,
      content,
      participants,
      createdAt: serverTimestamp(),
    })
    batch.update(conversationRef(db, conversationId), {
      lastMessageText: content,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()

    // `createdAt` stays null until the server resolves it; the subscription
    // delivers the authoritative copy a moment later.
    return {
      id: reference.id,
      conversationId,
      senderId,
      content,
      createdAt: null,
    } satisfies ChatMessage
  },
}

import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import type { ChatMessage, Conversation } from '@/types/chat'

/** `null` for an unresolved `serverTimestamp()` on a local write. */
const toIsoOrNull = (value: unknown): string | null =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : null

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []

/**
 * Firestore document → domain object, and the only place a malformed
 * conversation is rejected. `null` rather than a throw, so one bad document
 * can never break the whole list.
 */
export function toConversationDocument(
  id: string,
  data: DocumentData,
): Conversation | null {
  const participants = asStringArray(data.participants)
  if (participants.length !== 2) return null
  const [first, second] = participants
  if (first === second) return null

  const epoch = new Date(0).toISOString()
  const createdAt = toIsoOrNull(data.createdAt) ?? epoch

  return {
    id,
    connectionId: asString(data.connectionId) ?? id,
    participants: [first, second],
    lastMessageText: asString(data.lastMessageText),
    lastMessageSenderId: asString(data.lastMessageSenderId),
    lastMessageAt: toIsoOrNull(data.lastMessageAt),
    createdAt,
    updatedAt: toIsoOrNull(data.updatedAt) ?? createdAt,
  }
}

/** A message with no sender or no text is not a message. */
export function toMessageDocument(
  id: string,
  conversationId: string,
  data: DocumentData,
): ChatMessage | null {
  const senderId = asString(data.senderId)
  const content = asString(data.content)
  if (!senderId || content === null || content.length === 0) return null

  return {
    id,
    conversationId,
    senderId,
    content,
    createdAt: toIsoOrNull(data.createdAt),
  }
}

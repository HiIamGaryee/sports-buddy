import { MAX_MESSAGE_LENGTH } from '@/constants/chat'
import { getConnectionState } from '@/lib/connection'
import { normalizeMultiLine } from '@/lib/sanitize'
import type { Connection } from '@/types/connection'
import type { ChatMessage } from '@/types/chat'

/**
 * Pure chat rules. No Firebase, no storage, no React.
 *
 * Chat never re-derives relationship logic: it asks STEP 8's
 * `getConnectionState()` and accepts exactly one answer.
 */
export const canChat = (
  connection: Connection | null | undefined,
  currentUserId: string,
) => getConnectionState(connection, currentUserId) === 'connected'

/**
 * Trim, collapse runaway blank lines, and drop control/zero-width characters.
 * Message text is still plain text and is still rendered as text - see
 * `MessageBubble` - so `<script>` stays a word, not markup.
 */
export const normalizeMessageContent = (raw: string) =>
  normalizeMultiLine(raw)

/** `null` when the (already normalized) content is sendable. */
export function getMessageError(content: string): string | null {
  if (content.length === 0) return 'Type a message first.'
  if (content.length > MAX_MESSAGE_LENGTH) {
    return `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`
  }
  return null
}

/**
 * Chronological, with a message whose `serverTimestamp()` has not resolved
 * yet treated as the newest — that is exactly what it is, a write the sender
 * just made. Ties break on id so the order never wobbles between renders.
 */
export function compareMessages(a: ChatMessage, b: ChatMessage): number {
  if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id)
  if (a.createdAt === null) return 1
  if (b.createdAt === null) return -1
  return a.createdAt.localeCompare(b.createdAt)
}

/**
 * The realtime page and every older page land in the same list, so merging is
 * by `id` — never by array position. `incoming` wins a collision because it
 * is the fresher copy (a pending write resolving its server timestamp).
 */
export function mergeMessages(
  existing: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] {
  const byId = new Map(existing.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort(compareMessages)
}

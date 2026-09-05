import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import type { ChatMessage, Conversation } from '@/types/chat'

/**
 * Development chat history for `VITE_DATA_SOURCE=mock`. Seeded per mock
 * account against the connected buddies from
 * `mock-connection-repository.ts`, so pending buddies deliberately have no
 * conversation at all.
 *
 * Mei's thread is long enough (28 messages) to exercise the 20-message page
 * plus "Load earlier messages"; Jason's is short so conversation ordering is
 * visible; Chloe is connected with no conversation, which is the "Start a
 * conversation" row.
 */
type Speaker = 'me' | 'them'

interface ScriptLine {
  from: Speaker
  text: string
}

const MEI_SCRIPT = [
  { from: 'them', text: 'Hey! Saw you climb at the Subang gym last week.' },
  { from: 'me', text: 'That was me. Still very much a beginner though.' },
  { from: 'them', text: 'Same, I only started in June.' },
  { from: 'me', text: 'How often do you go?' },
  { from: 'them', text: 'Twice a week usually. Tuesday and Saturday.' },
  { from: 'me', text: 'Saturday works better for me.' },
  { from: 'them', text: 'Morning or afternoon?' },
  { from: 'me', text: 'Afternoon. Mornings are for running.' },
  { from: 'them', text: 'Fair. I cannot run to save my life.' },
  { from: 'me', text: 'It grows on you. Slowly.' },
  { from: 'them', text: 'Do you have your own shoes yet?' },
  { from: 'me', text: 'Not yet, still renting.' },
  { from: 'them', text: 'Rentals are fine at the start honestly.' },
  { from: 'me', text: 'Good, saves me some money.' },
  { from: 'them', text: 'Entry is about RM35 with the harness.' },
  { from: 'me', text: 'That is within what I usually budget.' },
  { from: 'them', text: 'Nice. Bouldering is cheaper if you prefer.' },
  { from: 'me', text: 'I have only done bouldering so far actually.' },
  { from: 'them', text: 'Then you will like the new wall, they reset it monthly.' },
  { from: 'me', text: 'How hard are the routes?' },
  { from: 'them', text: 'Plenty of easy ones, do not worry.' },
  { from: 'me', text: 'Perfect.' },
  { from: 'them', text: 'Want to try climbing next week?' },
  { from: 'me', text: 'Yes, let us do it.' },
  { from: 'them', text: 'Saturday afternoon then?' },
  { from: 'me', text: 'Works for me.' },
  { from: 'them', text: 'I will bring chalk, you just show up.' },
  { from: 'me', text: 'Deal. See you Saturday.' },
] as const satisfies readonly ScriptLine[]

const JASON_SCRIPT = [
  { from: 'me', text: 'Are you climbing this weekend?' },
  { from: 'them', text: 'Probably Saturday morning. You in?' },
] as const satisfies readonly ScriptLine[]

const SEED_SCRIPTS = [
  { buddyId: 'buddy_mei', script: MEI_SCRIPT },
  { buddyId: 'buddy_jason', script: JASON_SCRIPT },
] as const satisfies readonly { buddyId: string; script: readonly ScriptLine[] }[]

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/**
 * Timestamps are laid out backwards from the seed moment, with the older half
 * pushed a day earlier so the date separators ("Yesterday" / "Today") are
 * visible straight away.
 */
function messageTime(index: number, total: number, now: number): string {
  const minutesBack = (total - index) * 13
  const dayOffset = index < Math.floor(total / 2) ? DAY : 0
  return new Date(now - minutesBack * MINUTE - dayOffset).toISOString()
}

export interface SeededChat {
  conversations: Conversation[]
  messages: ChatMessage[]
}

/** Deterministic given a user id and a moment; written to storage once. */
export function buildSeededChat(currentUserId: string): SeededChat {
  const now = Date.now()
  const conversations: Conversation[] = []
  const messages: ChatMessage[] = []

  for (const { buddyId, script } of SEED_SCRIPTS) {
    const conversationId = createConnectionId(currentUserId, buddyId)
    const lines = script.map((line, index) => ({
      id: `${conversationId}__seed_${index.toString().padStart(3, '0')}`,
      conversationId,
      senderId: line.from === 'me' ? currentUserId : buddyId,
      content: line.text,
      createdAt: messageTime(index, script.length, now),
    }))
    const last = lines[lines.length - 1]

    messages.push(...lines)
    conversations.push({
      id: conversationId,
      connectionId: conversationId,
      participants: sortConnectionPair(currentUserId, buddyId),
      lastMessageText: last.content,
      lastMessageSenderId: last.senderId,
      lastMessageAt: last.createdAt,
      createdAt: lines[0].createdAt,
      updatedAt: last.createdAt,
    })
  }

  return { conversations, messages }
}

import { describe, expect, it } from 'vitest'

import { isConversationUnread } from '@/lib/chat-read-state'

const ME = 'me'
const BUDDY = 'buddy'

const conversation = (
  lastMessageAt: string | null,
  lastMessageSenderId: string | null,
) => ({ lastMessageAt, lastMessageSenderId })

describe('isConversationUnread', () => {
  it('is not unread when nobody has said anything', () => {
    expect(isConversationUnread(conversation(null, null), ME, undefined)).toBe(
      false,
    )
  })

  it("is never unread when the newest message is the viewer's own", () => {
    expect(
      isConversationUnread(
        conversation('2026-09-13T10:00:00.000Z', ME),
        ME,
        undefined,
      ),
    ).toBe(false)
  })

  it('is unread when the buddy wrote and the thread was never opened', () => {
    expect(
      isConversationUnread(
        conversation('2026-09-13T10:00:00.000Z', BUDDY),
        ME,
        undefined,
      ),
    ).toBe(true)
  })

  it('is unread when the buddy wrote after the viewer last read', () => {
    expect(
      isConversationUnread(
        conversation('2026-09-13T10:05:00.000Z', BUDDY),
        ME,
        '2026-09-13T10:00:00.000Z',
      ),
    ).toBe(true)
  })

  it('is read once the marker has reached the newest message', () => {
    expect(
      isConversationUnread(
        conversation('2026-09-13T10:05:00.000Z', BUDDY),
        ME,
        '2026-09-13T10:05:00.000Z',
      ),
    ).toBe(false)
  })

  it('is read when the marker is past the newest message', () => {
    expect(
      isConversationUnread(
        conversation('2026-09-13T10:05:00.000Z', BUDDY),
        ME,
        '2026-09-13T11:00:00.000Z',
      ),
    ).toBe(false)
  })
})

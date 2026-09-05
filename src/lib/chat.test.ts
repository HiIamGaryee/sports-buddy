import { describe, expect, it } from 'vitest'

import { MAX_MESSAGE_LENGTH } from '@/constants/chat'
import {
  canChat,
  compareMessages,
  getMessageError,
  mergeMessages,
  normalizeMessageContent,
} from '@/lib/chat'
import { createConnectionId, sortConnectionPair } from '@/lib/connection'
import type { ChatMessage } from '@/types/chat'
import type { Connection } from '@/types/connection'

const connection = (overrides: Partial<Connection> = {}): Connection => ({
  id: createConnectionId('gary', 'aina'),
  participants: sortConnectionPair('gary', 'aina'),
  requestedBy: ['gary'],
  status: 'pending',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  connectedAt: null,
  ...overrides,
})

const connected = () =>
  connection({
    requestedBy: sortConnectionPair('gary', 'aina'),
    status: 'connected',
    connectedAt: '2026-09-02T09:00:00.000Z',
  })

const message = (
  id: string,
  createdAt: string | null,
  senderId = 'gary',
): ChatMessage => ({
  id,
  conversationId: 'aina__gary',
  senderId,
  content: `message ${id}`,
  createdAt,
})

describe('canChat', () => {
  it('allows a connected pair, from either side', () => {
    expect(canChat(connected(), 'gary')).toBe(true)
    expect(canChat(connected(), 'aina')).toBe(true)
  })

  it('refuses a pending request, in either direction', () => {
    const pending = connection({ requestedBy: ['gary'] })
    expect(canChat(pending, 'gary')).toBe(false)
    expect(canChat(pending, 'aina')).toBe(false)
  })

  it('refuses when there is no connection at all', () => {
    expect(canChat(null, 'gary')).toBe(false)
    expect(canChat(undefined, 'gary')).toBe(false)
  })

  it('refuses an unrelated user, even on a connected pair', () => {
    expect(canChat(connected(), 'stranger')).toBe(false)
  })
})

describe('message content', () => {
  it('trims before anything else looks at it', () => {
    expect(normalizeMessageContent('  hello  ')).toBe('hello')
    expect(normalizeMessageContent('\n hi \n')).toBe('hi')
  })

  it('rejects empty and whitespace-only content', () => {
    expect(getMessageError(normalizeMessageContent(''))).not.toBeNull()
    expect(getMessageError(normalizeMessageContent('   '))).not.toBeNull()
    expect(getMessageError(normalizeMessageContent('\n\n'))).not.toBeNull()
  })

  it('rejects content over the limit', () => {
    expect(getMessageError('x'.repeat(MAX_MESSAGE_LENGTH + 1))).not.toBeNull()
  })

  it('accepts content at exactly the limit', () => {
    expect(getMessageError('x'.repeat(MAX_MESSAGE_LENGTH))).toBeNull()
  })

  it('accepts ordinary text', () => {
    expect(getMessageError('Badminton Saturday?')).toBeNull()
  })
})

describe('mergeMessages', () => {
  it('deduplicates by id, not by position', () => {
    const merged = mergeMessages(
      [message('a', '2026-09-01T10:00:00.000Z')],
      [
        message('a', '2026-09-01T10:00:00.000Z'),
        message('b', '2026-09-01T10:01:00.000Z'),
      ],
    )
    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('lets the incoming copy win, so a pending write resolves in place', () => {
    const merged = mergeMessages(
      [message('a', null)],
      [message('a', '2026-09-01T10:00:00.000Z')],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].createdAt).toBe('2026-09-01T10:00:00.000Z')
  })

  it('keeps older pages when a realtime page arrives', () => {
    const older = [
      message('old1', '2026-09-01T08:00:00.000Z'),
      message('old2', '2026-09-01T08:05:00.000Z'),
    ]
    const recent = [message('new1', '2026-09-01T10:00:00.000Z')]
    expect(mergeMessages(older, recent).map((entry) => entry.id)).toEqual([
      'old1',
      'old2',
      'new1',
    ])
  })

  it('is chronological however the pages arrive', () => {
    const merged = mergeMessages(
      [message('c', '2026-09-01T12:00:00.000Z')],
      [
        message('a', '2026-09-01T10:00:00.000Z'),
        message('b', '2026-09-01T11:00:00.000Z'),
      ],
    )
    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c'])
  })

  it('treats an unresolved timestamp as the newest message', () => {
    const merged = mergeMessages(
      [message('a', '2026-09-01T10:00:00.000Z')],
      [message('pending', null)],
    )
    expect(merged.map((entry) => entry.id)).toEqual(['a', 'pending'])
  })

  it('is deterministic for identical timestamps', () => {
    const same = '2026-09-01T10:00:00.000Z'
    const first = mergeMessages([], [message('b', same), message('a', same)])
    const second = mergeMessages([], [message('a', same), message('b', same)])
    expect(first.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(second.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('orders two pending messages stably', () => {
    expect(compareMessages(message('a', null), message('b', null))).toBeLessThan(0)
  })
})

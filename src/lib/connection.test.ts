import { describe, expect, it } from 'vitest'

import {
  createConnectionId,
  findNewMutualConnection,
  getConnectionState,
  getOtherParticipantId,
  isMutuallyRequested,
  sortConnectionPair,
  toConnectionMap,
  toConnectionStates,
} from '@/lib/connection'
import type { Connection, ConnectionState } from '@/types/connection'

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

describe('createConnectionId', () => {
  it('is the same whichever order the users are given in', () => {
    expect(createConnectionId('xyz', 'abc')).toBe(createConnectionId('abc', 'xyz'))
  })

  it('is stable across calls', () => {
    expect(createConnectionId('gary', 'aina')).toBe('aina__gary')
    expect(createConnectionId('gary', 'aina')).toBe(
      createConnectionId('gary', 'aina'),
    )
  })

  it('does not collide when an id itself contains an underscore', () => {
    // A single `_` separator would make both of these `a_b_c`.
    expect(createConnectionId('a_b', 'c')).not.toBe(
      createConnectionId('a', 'b_c'),
    )
  })

  it('produces one id per pair, so a pair can never hold two documents', () => {
    const ids = new Set([
      createConnectionId('user_demo_001', 'buddy_aina'),
      createConnectionId('buddy_aina', 'user_demo_001'),
    ])
    expect(ids.size).toBe(1)
  })
})

describe('getOtherParticipantId', () => {
  it('returns the other user from either side', () => {
    expect(getOtherParticipantId(connection(), 'gary')).toBe('aina')
    expect(getOtherParticipantId(connection(), 'aina')).toBe('gary')
  })

  it('returns null for someone who is not a participant', () => {
    expect(getOtherParticipantId(connection(), 'stranger')).toBeNull()
  })

  it('handles a malformed participant list safely', () => {
    expect(
      getOtherParticipantId(
        { participants: ['gary'] as unknown as [string, string] },
        'gary',
      ),
    ).toBeNull()
    expect(
      getOtherParticipantId(
        { participants: [] as unknown as [string, string] },
        'gary',
      ),
    ).toBeNull()
  })
})

describe('getConnectionState', () => {
  it('is none without a document', () => {
    expect(getConnectionState(null, 'gary')).toBe('none')
    expect(getConnectionState(undefined, 'gary')).toBe('none')
  })

  it('is perspective aware for a pending request', () => {
    const pending = connection({ requestedBy: ['gary'] })
    expect(getConnectionState(pending, 'gary')).toBe('pending-outgoing')
    expect(getConnectionState(pending, 'aina')).toBe('pending-incoming')
  })

  it('is connected for both once the pair is mutual', () => {
    const connected = connection({
      requestedBy: ['gary', 'aina'],
      status: 'connected',
      connectedAt: '2026-09-02T09:00:00.000Z',
    })
    expect(getConnectionState(connected, 'gary')).toBe('connected')
    expect(getConnectionState(connected, 'aina')).toBe('connected')
  })

  it('is none for a user who is not in the pair', () => {
    expect(getConnectionState(connection(), 'stranger')).toBe('none')
  })
})

describe('toConnectionMap', () => {
  it('keys connections by the other participant', () => {
    const map = toConnectionMap(
      [
        connection(),
        connection({
          id: createConnectionId('gary', 'mei'),
          participants: sortConnectionPair('gary', 'mei'),
          requestedBy: ['gary', 'mei'],
          status: 'connected',
        }),
      ],
      'gary',
    )
    expect([...map.keys()].sort()).toEqual(['aina', 'mei'])
    expect(map.get('mei')?.status).toBe('connected')
  })

  it('drops documents the user is not part of', () => {
    expect(toConnectionMap([connection()], 'stranger').size).toBe(0)
  })
})

describe('findNewMutualConnection', () => {
  const states = (entries: Record<string, ConnectionState>) =>
    new Map(Object.entries(entries))

  it('reports nothing on the first snapshot, however connected it is', () => {
    // App open with an existing connection must not fire the success UI.
    expect(findNewMutualConnection(null, states({ aina: 'connected' }))).toBeNull()
  })

  it('reports a pending request that just became mutual', () => {
    expect(
      findNewMutualConnection(
        states({ aina: 'pending-outgoing' }),
        states({ aina: 'connected' }),
      ),
    ).toBe('aina')
    expect(
      findNewMutualConnection(
        states({ aina: 'pending-incoming' }),
        states({ aina: 'connected' }),
      ),
    ).toBe('aina')
  })

  it('reports nothing when a connection was already connected', () => {
    expect(
      findNewMutualConnection(
        states({ aina: 'connected' }),
        states({ aina: 'connected' }),
      ),
    ).toBeNull()
  })

  it('reports nothing for a brand new pending request', () => {
    expect(
      findNewMutualConnection(states({}), states({ aina: 'pending-outgoing' })),
    ).toBeNull()
  })
})

describe('toConnectionStates', () => {
  it('maps each connection to the perspective of the viewer', () => {
    const map = toConnectionStates([connection()], 'aina')
    expect(map.get('gary')).toBe('pending-incoming')
  })
})

describe('isMutuallyRequested', () => {
  it('needs both participants to have asked', () => {
    expect(isMutuallyRequested(['gary', 'aina'], ['gary'])).toBe(false)
    expect(isMutuallyRequested(['gary', 'aina'], ['gary', 'aina'])).toBe(true)
  })

  it('is not satisfied by the same user twice', () => {
    expect(isMutuallyRequested(['gary', 'aina'], ['gary', 'gary'])).toBe(false)
  })
})

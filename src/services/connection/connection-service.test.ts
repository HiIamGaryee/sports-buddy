import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createConnectionId, getConnectionState, toConnectionMap } from '@/lib/connection'
import { connectionService } from '@/services/connection/connection-service'
import { discoverService } from '@/services/discover/discover-service'
import type { Connection } from '@/types/connection'
import type { RankedBuddy } from '@/types/matching'

/**
 * The connection domain end to end through the mock repository — the same
 * repository the app uses with `VITE_DATA_SOURCE=mock`, so these cover the
 * service rules AND mock persistence in one pass.
 */
const GARY = 'gary'
const AINA = 'aina'

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

/** Reads what a fresh app load would see — the mock store is the only source. */
function loadFor(userId: string): Connection[] {
  let loaded: Connection[] = []
  const unsubscribe = connectionService.subscribe(
    userId,
    (connections) => {
      loaded = connections
    },
    () => {},
  )
  unsubscribe()
  return loaded
}

const stateBetween = (userId: string, otherId: string) =>
  getConnectionState(toConnectionMap(loadFor(userId), userId).get(otherId), userId)

describe('connect', () => {
  it('rejects connecting to yourself', async () => {
    await expect(connectionService.connect(GARY, GARY)).rejects.toThrow(
      /yourself/i,
    )
    // Nothing was written — and certainly no document pointing at one person
    // twice. (Seeded mock relationships are unrelated to this pair.)
    expect(
      loadFor(GARY).some(
        (entry) => entry.id === createConnectionId(GARY, GARY),
      ),
    ).toBe(false)
  })

  it('creates one pending document on the deterministic pair id', async () => {
    const connection = await connectionService.connect(GARY, AINA)
    expect(connection.id).toBe(createConnectionId(GARY, AINA))
    expect(connection.status).toBe('pending')
    expect(connection.requestedBy).toEqual([GARY])
    expect(connection.connectedAt).toBeNull()
  })

  it('reads as pending-outgoing to the requester', async () => {
    await connectionService.connect(GARY, AINA)
    expect(stateBetween(GARY, AINA)).toBe('pending-outgoing')
  })

  it('reads as pending-incoming to the recipient', async () => {
    await connectionService.connect(GARY, AINA)
    expect(stateBetween(AINA, GARY)).toBe('pending-incoming')
  })

  it('becomes connected when the second user connects back', async () => {
    await connectionService.connect(GARY, AINA)
    const connected = await connectionService.connect(AINA, GARY)

    expect(connected.status).toBe('connected')
    expect([...connected.requestedBy].sort()).toEqual([AINA, GARY])
    expect(connected.connectedAt).not.toBeNull()
  })

  it('shows connected to both participants', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.connect(AINA, GARY)

    expect(stateBetween(GARY, AINA)).toBe('connected')
    expect(stateBetween(AINA, GARY)).toBe('connected')
  })

  it('is idempotent — a repeated Connect changes nothing', async () => {
    const first = await connectionService.connect(GARY, AINA)
    const second = await connectionService.connect(GARY, AINA)

    expect(second).toEqual(first)
    expect(second.requestedBy).toEqual([GARY])
    expect(loadFor(GARY).filter((entry) => entry.id === first.id)).toHaveLength(1)
  })

  it('never duplicates the requester or the document', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.connect(GARY, AINA)
    await connectionService.connect(GARY, AINA)

    const pairDocuments = loadFor(GARY).filter(
      (entry) => entry.id === createConnectionId(GARY, AINA),
    )
    expect(pairDocuments).toHaveLength(1)
    expect(pairDocuments[0].requestedBy).toEqual([GARY])
    expect(pairDocuments[0].status).toBe('pending')
  })

  it('stays connected if either user taps Connect again', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.connect(AINA, GARY)
    const again = await connectionService.connect(GARY, AINA)

    expect(again.status).toBe('connected')
    expect(again.requestedBy).toHaveLength(2)
  })
})

describe('cancelRequest', () => {
  it('removes a pending request the caller sent', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.cancelRequest(GARY, AINA)

    expect(stateBetween(GARY, AINA)).toBe('none')
    expect(stateBetween(AINA, GARY)).toBe('none')
  })

  it('refuses to let the recipient cancel the sender’s request', async () => {
    await connectionService.connect(GARY, AINA)
    await expect(connectionService.cancelRequest(AINA, GARY)).rejects.toThrow(
      /who sent a request/i,
    )
    expect(stateBetween(GARY, AINA)).toBe('pending-outgoing')
  })

  it('refuses to cancel a connected relationship', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.connect(AINA, GARY)

    await expect(connectionService.cancelRequest(GARY, AINA)).rejects.toThrow(
      /already connected/i,
    )
    expect(stateBetween(GARY, AINA)).toBe('connected')
  })

  it('is safe to call when there is nothing to cancel', async () => {
    await expect(
      connectionService.cancelRequest(GARY, AINA),
    ).resolves.toBeUndefined()
  })

  it('rejects cancelling with yourself', async () => {
    await expect(connectionService.cancelRequest(GARY, GARY)).rejects.toThrow(
      /yourself/i,
    )
  })
})

describe('mock persistence', () => {
  it('keeps a pending request across a reload', async () => {
    await connectionService.connect(GARY, AINA)
    // A fresh read is exactly what a refresh does — nothing is held in memory.
    expect(stateBetween(GARY, AINA)).toBe('pending-outgoing')
  })

  it('keeps a cancellation across a reload', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.cancelRequest(GARY, AINA)
    expect(stateBetween(GARY, AINA)).toBe('none')
  })

  it('keeps a mutual connection across a reload', async () => {
    await connectionService.connect(GARY, AINA)
    await connectionService.connect(AINA, GARY)
    expect(stateBetween(GARY, AINA)).toBe('connected')
  })

  it('seeds one of each state for a mock account, and only once', async () => {
    const seeded = loadFor(GARY)
    const states = seeded
      .map((connection) => getConnectionState(connection, GARY))
      .sort()
    expect(states).toEqual([
      'connected',
      'pending-incoming',
      'pending-outgoing',
    ])

    // Cancelling a seeded request must not resurrect it on the next read.
    const outgoing = toConnectionMap(seeded, GARY)
    const outgoingId = [...outgoing].find(
      ([, connection]) =>
        getConnectionState(connection, GARY) === 'pending-outgoing',
    )?.[0]
    await connectionService.cancelRequest(GARY, outgoingId ?? '')
    expect(loadFor(GARY)).toHaveLength(2)
  })
})

describe('compatibility is untouched by connection state', () => {
  const buddy = (userId: string): RankedBuddy => ({
    profile: {
      userId,
      displayName: 'Test',
      photoUrl: null,
      bio: '',
      sports: [{ sportId: 'badminton', skillLevel: 'intermediate' }],
      intents: ['casual'],
      preferredIntensity: 'moderate',
      availability: [{ day: 'saturday', periods: ['evening'] }],
      area: 'subang-jaya',
      budget: { min: 20, max: 40 },
      profileCompleteness: 100,
      discoverable: true,
      updatedAt: '2026-08-30T09:00:00.000Z',
    },
    compatibility: {
      score: 80,
      label: 'Great fit',
      factors: {} as RankedBuddy['compatibility']['factors'],
      reasons: [],
      sharedSports: ['badminton'],
      bestSportMatch: 'badminton',
    },
  })

  it('joins state without touching the compatibility result', async () => {
    await connectionService.connect(GARY, AINA)
    const source = buddy(AINA)
    const [joined] = discoverService.joinConnectionStates(
      [source],
      toConnectionMap(loadFor(GARY), GARY),
      GARY,
    )

    expect(joined.connectionState).toBe('pending-outgoing')
    // The same object, not a copy with an extra field bolted on.
    expect(joined.compatibility).toBe(source.compatibility)
    expect(joined.profile).toBe(source.profile)
  })

  it('gives the same score whatever the relationship is', async () => {
    const source = buddy(AINA)
    const before = discoverService.joinConnectionStates(
      [source],
      toConnectionMap(loadFor(GARY), GARY),
      GARY,
    )[0]

    await connectionService.connect(GARY, AINA)
    await connectionService.connect(AINA, GARY)

    const after = discoverService.joinConnectionStates(
      [source],
      toConnectionMap(loadFor(GARY), GARY),
      GARY,
    )[0]

    expect(before.connectionState).toBe('none')
    expect(after.connectionState).toBe('connected')
    expect(after.compatibility.score).toBe(before.compatibility.score)
  })
})

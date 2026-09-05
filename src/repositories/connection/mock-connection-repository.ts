import { MOCK_STORAGE_KEYS } from '@/constants/app'
import {
  createConnectionId,
  isMutuallyRequested,
  sortConnectionPair,
} from '@/lib/connection'
import type { ConnectionRepository } from '@/repositories/connection/connection-repository'
import { delay, readStoreRecord, writeStore } from '@/repositories/mock-store'
import {
  CONNECTION_ERROR_CODES,
  connectionError,
} from '@/services/connection/connection-error'
import type { Connection } from '@/types/connection'

interface MockConnectionStore {
  /** So cancelling a seeded request does not resurrect it on the next read. */
  seededUserIds: string[]
  connections: Connection[]
}

const EMPTY_STORE: MockConnectionStore = { seededUserIds: [], connections: [] }

const readMockStore = () =>
  readStoreRecord<MockConnectionStore>(MOCK_STORAGE_KEYS.connections, EMPTY_STORE)

const writeMockStore = (store: MockConnectionStore) =>
  writeStore(MOCK_STORAGE_KEYS.connections, store)

/**
 * One of each state, so every branch of the UI is reachable in mock mode
 * without touching a real backend. `requestedBy` says who has asked:
 * `them` → pending-incoming, `me` → pending-outgoing, `both` → connected.
 *
 * Three connected buddies exist because chat (STEP 9) needs them: one with a
 * long history, one with a short one, and one who has never messaged.
 */
const SEEDS = [
  { userId: 'buddy_aina', requestedBy: 'them' },
  { userId: 'buddy_mei', requestedBy: 'both' },
  { userId: 'buddy_jason', requestedBy: 'both' },
  { userId: 'buddy_chloe', requestedBy: 'both' },
  { userId: 'buddy_ryan', requestedBy: 'me' },
] as const satisfies readonly {
  userId: string
  requestedBy: 'me' | 'them' | 'both'
}[]

const SEED_TIME = '2026-09-01T09:00:00.000Z'

function buildSeed(
  currentUserId: string,
  seed: (typeof SEEDS)[number],
): Connection {
  const requestedBy =
    seed.requestedBy === 'me'
      ? [currentUserId]
      : seed.requestedBy === 'them'
        ? [seed.userId]
        : sortConnectionPair(currentUserId, seed.userId)

  return {
    id: createConnectionId(currentUserId, seed.userId),
    participants: sortConnectionPair(currentUserId, seed.userId),
    requestedBy,
    status: seed.requestedBy === 'both' ? 'connected' : 'pending',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
    connectedAt: seed.requestedBy === 'both' ? SEED_TIME : null,
  }
}

/** Seeds once per mock account, then never again. */
function ensureSeeded(currentUserId: string): MockConnectionStore {
  const store = readMockStore()
  if (store.seededUserIds.includes(currentUserId)) return store

  const existingIds = store.connections.map((connection) => connection.id)
  const seeded = SEEDS.map((seed) => buildSeed(currentUserId, seed)).filter(
    (connection) => !existingIds.includes(connection.id),
  )
  const next: MockConnectionStore = {
    seededUserIds: [...store.seededUserIds, currentUserId],
    connections: [...store.connections, ...seeded],
  }
  writeMockStore(next)
  return next
}

const forUser = (store: MockConnectionStore, userId: string) =>
  store.connections.filter((connection) =>
    connection.participants.includes(userId),
  )

interface MockListener {
  userId: string
  onChange: (connections: Connection[]) => void
}

const listeners = new Set<MockListener>()

/** Mirrors the Firebase subscription: every writer re-emits to every reader. */
function notify() {
  const store = readMockStore()
  listeners.forEach((listener) =>
    listener.onChange(forUser(store, listener.userId)),
  )
}

function findConnection(store: MockConnectionStore, id: string) {
  return store.connections.find((connection) => connection.id === id) ?? null
}

export const mockConnectionRepository: ConnectionRepository = {
  subscribeForUser(userId, onChange) {
    const listener: MockListener = { userId, onChange }
    listeners.add(listener)
    onChange(forUser(ensureSeeded(userId), userId))
    return () => listeners.delete(listener)
  },

  async connect(currentUserId, targetUserId) {
    await delay(null, 250)
    const store = ensureSeeded(currentUserId)
    const id = createConnectionId(currentUserId, targetUserId)
    const existing = findConnection(store, id)

    if (!existing) {
      const created: Connection = {
        id,
        participants: sortConnectionPair(currentUserId, targetUserId),
        requestedBy: [currentUserId],
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        connectedAt: null,
      }
      writeMockStore({
        ...store,
        connections: [...store.connections, created],
      })
      notify()
      return created
    }

    // Idempotent, exactly like the Firebase transaction.
    if (existing.requestedBy.includes(currentUserId)) return existing

    const requestedBy = [...existing.requestedBy, currentUserId]
    const mutual = isMutuallyRequested(existing.participants, requestedBy)
    const updated: Connection = {
      ...existing,
      requestedBy,
      status: mutual ? 'connected' : 'pending',
      connectedAt: mutual ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    }
    writeMockStore({
      ...store,
      connections: store.connections.map((connection) =>
        connection.id === id ? updated : connection,
      ),
    })
    notify()
    return updated
  },

  async cancelPending(currentUserId, targetUserId) {
    await delay(null, 200)
    const store = ensureSeeded(currentUserId)
    const id = createConnectionId(currentUserId, targetUserId)
    const existing = findConnection(store, id)
    if (!existing) return

    if (existing.status === 'connected') {
      throw connectionError(CONNECTION_ERROR_CODES.alreadyConnected)
    }
    if (
      existing.requestedBy.length !== 1 ||
      existing.requestedBy[0] !== currentUserId
    ) {
      throw connectionError(CONNECTION_ERROR_CODES.notYourRequest)
    }

    writeMockStore({
      ...store,
      connections: store.connections.filter(
        (connection) => connection.id !== id,
      ),
    })
    notify()
  },
}

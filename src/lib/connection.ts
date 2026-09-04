import type {
  Connection,
  ConnectionMap,
  ConnectionState,
} from '@/types/connection'

/**
 * Pure connection helpers. No Firebase, no storage, no React — the pair id
 * and the perspective rules are the two things everything else depends on.
 */

/**
 * Deliberately NOT `_`: mock ids contain single underscores, so `a_b` + `c`
 * and `a` + `b_c` would collide on the same document id.
 */
const ID_SEPARATOR = '__'

/** Sorted, so the two users always agree on where their document lives. */
export const sortConnectionPair = (
  userIdA: string,
  userIdB: string,
): [string, string] =>
  userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA]

/**
 * The deterministic pair id. `createConnectionId(a, b)` and
 * `createConnectionId(b, a)` MUST return the same string — it is what stops
 * two half-relationships existing for one pair.
 */
export const createConnectionId = (userIdA: string, userIdB: string) =>
  sortConnectionPair(userIdA, userIdB).join(ID_SEPARATOR)

/** `null` when the user is not a participant, or the pair is malformed. */
export function getOtherParticipantId(
  connection: Pick<Connection, 'participants'>,
  currentUserId: string,
): string | null {
  const { participants } = connection
  if (participants.length !== 2) return null
  const [first, second] = participants
  if (first === currentUserId) return second
  if (second === currentUserId) return first
  return null
}

/**
 * The single perspective rule. A missing document is `none`; a `connected`
 * document is `connected` for both; a `pending` document depends on who
 * asked. Anything malformed degrades to `none` rather than throwing.
 */
export function getConnectionState(
  connection: Connection | null | undefined,
  currentUserId: string,
): ConnectionState {
  if (!connection) return 'none'
  if (getOtherParticipantId(connection, currentUserId) === null) return 'none'
  if (connection.status === 'connected') return 'connected'
  return connection.requestedBy.includes(currentUserId)
    ? 'pending-outgoing'
    : 'pending-incoming'
}

/** `otherUserId → connection`, so decorating candidates costs no extra reads. */
export function toConnectionMap(
  connections: readonly Connection[],
  currentUserId: string,
): ConnectionMap {
  const map = new Map<string, Connection>()
  for (const connection of connections) {
    const otherId = getOtherParticipantId(connection, currentUserId)
    if (otherId) map.set(otherId, connection)
  }
  return map
}

/** `otherUserId → state`, the shape transitions are detected from. */
export function toConnectionStates(
  connections: readonly Connection[],
  currentUserId: string,
): ReadonlyMap<string, ConnectionState> {
  return new Map(
    [...toConnectionMap(connections, currentUserId)].map(
      ([otherId, connection]) => [
        otherId,
        getConnectionState(connection, currentUserId),
      ],
    ),
  )
}

/**
 * The id of someone this pair *just* became mutually connected with, or
 * `null`. `before === null` means there is no previous snapshot to compare —
 * an app open — so an existing connection is never reported as new. This is
 * what stops the success dialog reappearing on every refresh.
 */
export function findNewMutualConnection(
  before: ReadonlyMap<string, ConnectionState> | null,
  after: ReadonlyMap<string, ConnectionState>,
): string | null {
  if (!before) return null
  for (const [otherId, state] of after) {
    const wasPending = before.get(otherId)
    if (
      state === 'connected' &&
      (wasPending === 'pending-outgoing' || wasPending === 'pending-incoming')
    ) {
      return otherId
    }
  }
  return null
}

/** True once both participants have asked to connect. */
export const isMutuallyRequested = (
  participants: readonly string[],
  requestedBy: readonly string[],
) =>
  participants.length === 2 &&
  participants.every((participant) => requestedBy.includes(participant))

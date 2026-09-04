/** What Firestore stores. Perspective-free — see `ConnectionState`. */
export type ConnectionStatus = 'pending' | 'connected'

/**
 * What a specific viewer sees. Derived at runtime from the document plus who
 * is asking, and therefore NEVER persisted: the same `pending` document is
 * `pending-outgoing` to the requester and `pending-incoming` to the other.
 */
export type ConnectionState =
  | 'none'
  | 'pending-outgoing'
  | 'pending-incoming'
  | 'connected'

/**
 * One document per pair, at `connections/{createConnectionId(a, b)}`. It holds
 * ids and relationship metadata only — never a copy of a profile, never a
 * compatibility score.
 */
export interface Connection {
  id: string
  /** Exactly the two users, sorted, so the id and the pair always agree. */
  participants: [string, string]
  /** One id → pending, both → connected. No duplicates, never empty. */
  requestedBy: string[]
  status: ConnectionStatus
  /** ISO strings in the domain; Firestore timestamps stay in the repository. */
  createdAt: string
  updatedAt: string
  connectedAt: string | null
}

/** `otherUserId → connection`, built once per load to avoid N+1 reads. */
export type ConnectionMap = ReadonlyMap<string, Connection>

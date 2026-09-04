import type { Connection } from '@/types/connection'

/**
 * Relationship persistence. The repository owns the read/write mechanics and
 * the atomicity of a state transition; the service owns the domain rules.
 * Both users are participants in the same document, so unlike
 * `publicProfiles` there is no read/write repository split to make.
 */
export interface ConnectionRepository {
  /**
   * A scoped subscription to the signed-in user's own connections — the ONLY
   * realtime listener in the app, and never the whole collection. Emits the
   * current list immediately, then on every change. Returns an unsubscribe.
   */
  subscribeForUser(
    userId: string,
    onChange: (connections: Connection[]) => void,
    onError: (error: unknown) => void,
  ): () => void

  /**
   * Idempotent. Creates the pending document when it is missing, adds the
   * caller to `requestedBy` when it exists, and promotes the pair to
   * `connected` once both have asked. Calling it twice changes nothing the
   * second time.
   */
  connect(currentUserId: string, targetUserId: string): Promise<Connection>

  /**
   * Deletes a pending document the caller is the sole requester of. Must
   * reject a `connected` relationship and somebody else's request.
   */
  cancelPending(currentUserId: string, targetUserId: string): Promise<void>
}

export const CONNECTIONS_COLLECTION = 'connections'

/**
 * A generous ceiling for an MVP account. `array-contains` + `limit` needs no
 * composite index; pagination arrives with a connections list screen.
 */
export const CONNECTION_BATCH_LIMIT = 200

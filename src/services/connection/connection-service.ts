import { connectionRepository } from '@/repositories/repositories'
import {
  CONNECTION_ERROR_CODES,
  CONNECTION_FALLBACK_MESSAGES,
  connectionError,
  toConnectionError,
} from '@/services/connection/connection-error'
import type { Connection } from '@/types/connection'
import { blockRepository } from '@/repositories/repositories'

/**
 * The domain rules for connecting. No React state in here, and no Firebase:
 * it validates, delegates to the repository and converts every failure into a
 * `ConnectionError` carrying a message that is safe to show a user.
 *
 * Compatibility and connection are separate systems — nothing in
 * `src/services/matching` is imported here, and nothing here is imported
 * there.
 */
export const connectionService = {
  /** Scoped to one user. The provider owns the lifetime of the subscription. */
  subscribe(
    userId: string,
    onChange: (connections: Connection[]) => void,
    onError: (error: Error) => void,
  ) {
    return connectionRepository.subscribeForUser(userId, onChange, (error) =>
      onError(toConnectionError(error, CONNECTION_FALLBACK_MESSAGES.load)),
    )
  },

  /**
   * Idempotent by contract. Self-connection is rejected here as well as being
   * impossible through Discover — defence in depth, since a stale link or a
   * typed URL should never create a document pointing at one person twice.
   */
  async connect(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw toConnectionError(
        connectionError(CONNECTION_ERROR_CODES.self),
        CONNECTION_FALLBACK_MESSAGES.connect,
      )
    }

    try {
      if ((await blockRepository.getBlockedUserIds(currentUserId)).includes(targetUserId)) throw new Error('This user is unavailable.')
      return await connectionRepository.connect(currentUserId, targetUserId)
    } catch (error) {
      throw toConnectionError(error, CONNECTION_FALLBACK_MESSAGES.connect)
    }
  },

  /**
   * Only a pending request the caller sent can be cancelled. An incoming
   * request is the other person's intent, and a connected relationship needs
   * a deliberate disconnect flow that does not exist yet.
   */
  async cancelRequest(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw toConnectionError(
        connectionError(CONNECTION_ERROR_CODES.self),
        CONNECTION_FALLBACK_MESSAGES.cancel,
      )
    }

    try {
      await connectionRepository.cancelPending(currentUserId, targetUserId)
    } catch (error) {
      throw toConnectionError(error, CONNECTION_FALLBACK_MESSAGES.cancel)
    }
  },
}

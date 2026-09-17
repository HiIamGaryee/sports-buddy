import { useCallback } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { activityPostService } from '@/services/activity-post/activity-post-service'
import type { ActivityPost } from '@/types/activity-post'

/**
 * Join, leave, approve and decline — each followed by `onChanged` so the list
 * showing the post reloads.
 *
 * A post's spot and the connection are separate systems composed HERE, not
 * inside either service: a connection is still the only thing that lets two
 * people chat. So joining (or asking to) also asks to connect with the author,
 * and an author approving someone connects back — once someone is in, the two
 * of them can talk. Both connect calls are idempotent.
 */
export function usePostActions(onChanged: () => void) {
  const { user } = useAuth()
  const { connect, getConnectionState } = useConnections()
  const userId = user?.id ?? null

  const connectIfNeeded = useCallback(
    async (otherUserId: string) => {
      const state = getConnectionState(otherUserId)
      if (state === 'connected' || state === 'pending-outgoing') return
      await connect(otherUserId)
    },
    [connect, getConnectionState],
  )

  const join = useCallback(
    async (post: ActivityPost) => {
      if (!userId) return
      await activityPostService.join(post.id, userId)
      onChanged()
      await connectIfNeeded(post.authorId)
    },
    [userId, onChanged, connectIfNeeded],
  )

  const leave = useCallback(
    async (post: ActivityPost) => {
      if (!userId) return
      await activityPostService.leave(post.id, userId)
      onChanged()
    },
    [userId, onChanged],
  )

  const approve = useCallback(
    async (post: ActivityPost, joinerId: string) => {
      if (!userId) return
      await activityPostService.approve(post.id, userId, joinerId)
      onChanged()
      await connectIfNeeded(joinerId)
    },
    [userId, onChanged, connectIfNeeded],
  )

  const decline = useCallback(
    async (post: ActivityPost, joinerId: string) => {
      if (!userId) return
      await activityPostService.decline(post.id, userId, joinerId)
      onChanged()
    },
    [userId, onChanged],
  )

  return { viewerId: userId, join, leave, approve, decline }
}

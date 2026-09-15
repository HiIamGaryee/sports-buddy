import { useCallback } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/hooks/use-subscription'
import { groupActivityService } from '@/services/group-activity/group-activity-service'
import type { GroupActivity } from '@/types/group-activity'

/** Join, leave and organizer-remove — each followed by `onChanged`. */
export function useGroupActivityActions(onChanged: () => void) {
  const { user } = useAuth()
  const { state: subscriptionState } = useSubscription()
  const userId = user?.id ?? null

  const join = useCallback(
    async (activity: GroupActivity) => {
      if (!userId) return
      await groupActivityService.join(activity.id, userId, new Date(), subscriptionState)
      onChanged()
    },
    [userId, subscriptionState, onChanged],
  )

  const leave = useCallback(
    async (activity: GroupActivity) => {
      if (!userId) return
      await groupActivityService.leave(activity.id, userId)
      onChanged()
    },
    [userId, onChanged],
  )

  const removeParticipant = useCallback(
    async (activity: GroupActivity, participantId: string) => {
      if (!userId) return
      await groupActivityService.removeParticipant(activity.id, userId, participantId)
      onChanged()
    },
    [userId, onChanged],
  )

  return { viewerId: userId, join, leave, removeParticipant }
}

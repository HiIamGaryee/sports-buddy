import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { activityService } from '@/services/activity/activity-service'
import { discoverService } from '@/services/discover/discover-service'
import type { Activity } from '@/types/activity'

interface ActivityState {
  key: string
  activity: Activity | null
  isLoading: boolean
  error: string
}

/**
 * One confirmed activity. A one-time read: an activity is immutable in this
 * step, so there is nothing to subscribe to.
 *
 * A missing activity and one belonging to other people resolve identically,
 * so a guessed id reveals nothing.
 */
export function useActivity(activityId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const requestKey = `${activityId ?? ''}#${userId ?? ''}`
  const [state, setState] = useState<ActivityState>({
    key: requestKey,
    activity: null,
    isLoading: true,
    error: '',
  })
  // Reset during render when the route or user changes — no effect needed.
  if (state.key !== requestKey) {
    setState({ key: requestKey, activity: null, isLoading: true, error: '' })
  }

  const [buddy, setBuddy] = useState<{
    displayName: string
    photoUrl: string | null
  } | null>(null)

  useEffect(() => {
    if (!activityId || !userId) return

    let active = true
    activityService
      .getForParticipant(activityId, userId)
      .then((activity) => {
        if (active) {
          setState({ key: requestKey, activity, isLoading: false, error: '' })
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          key: requestKey,
          activity: null,
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : 'This activity is unavailable.',
        })
      })

    return () => {
      active = false
    }
  }, [activityId, userId, requestKey])

  const buddyId =
    state.activity && userId
      ? activityService.getBuddyId(state.activity, userId)
      : null

  useEffect(() => {
    if (!buddyId) return

    let active = true
    // One discovery-safe read; private profiles are never touched.
    discoverService
      .getCandidate(buddyId)
      .then((profile) => {
        if (active && profile) {
          setBuddy({
            displayName: profile.displayName,
            photoUrl: profile.photoUrl,
          })
        }
      })
      .catch(() => {
        // Without a projection the page falls back to generic wording.
      })

    return () => {
      active = false
    }
  }, [buddyId])

  return {
    activity: state.activity,
    isLoading: state.isLoading,
    error: state.error,
    buddyName: buddy?.displayName ?? 'your sports buddy',
    buddyPhotoUrl: buddy?.photoUrl ?? null,
  }
}

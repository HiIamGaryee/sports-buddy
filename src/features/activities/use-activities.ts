import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { activityService } from '@/services/activity/activity-service'
import { discoverService } from '@/services/discover/discover-service'
import type { Activity, ActivityWithBuddy } from '@/types/activity'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface ActivitiesState {
  key: string
  activities: Activity[]
  isLoading: boolean
  error: string
}

const NO_PROFILES: DiscoveryProfile[] = []

/** Attaches discovery-safe buddy details to activities. */
function withBuddies(
  activities: readonly Activity[],
  profiles: readonly DiscoveryProfile[],
  userId: string,
): ActivityWithBuddy[] {
  const byId = new Map(profiles.map((profile) => [profile.userId, profile]))
  return activities.map((activity) => {
    const buddyId = activityService.getBuddyId(activity, userId) ?? ''
    const profile = byId.get(buddyId)
    return {
      activity,
      buddyId,
      buddyName: profile?.displayName ?? 'your sports buddy',
      buddyPhotoUrl: profile?.photoUrl ?? null,
    } satisfies ActivityWithBuddy
  })
}

/**
 * The signed-in user's upcoming activities. One scoped read plus ONE batched
 * `publicProfiles` query for every buddy on the list — never a read per row,
 * and never `users/{uid}`.
 *
 * A one-time read on purpose: a confirmed activity is immutable, so there is
 * nothing to subscribe to.
 */
export function useUpcomingActivities() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [reloadToken, setReloadToken] = useState(0)

  const requestKey = `${userId ?? ''}#${reloadToken}`
  const [state, setState] = useState<ActivitiesState>({
    key: requestKey,
    activities: [],
    isLoading: userId !== null,
    error: '',
  })
  // Reset during render when the user or refresh token changes.
  if (state.key !== requestKey) {
    setState({ key: requestKey, activities: [], isLoading: true, error: '' })
  }

  useEffect(() => {
    if (!userId) return

    let active = true
    activityService
      .getUpcoming(userId)
      .then((activities) => {
        if (active) {
          setState({ key: requestKey, activities, isLoading: false, error: '' })
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          key: requestKey,
          activities: [],
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "We couldn't load your activities.",
        })
      })

    return () => {
      active = false
    }
  }, [userId, requestKey])

  const buddyIds = useMemo(
    () =>
      userId
        ? [
            ...new Set(
              state.activities.flatMap((activity) => {
                const id = activityService.getBuddyId(activity, userId)
                return id ? [id] : []
              }),
            ),
          ].sort()
        : [],
    [state.activities, userId],
  )

  const profilesKey = buddyIds.join(',')
  const [profileState, setProfileState] = useState<{
    key: string
    profiles: DiscoveryProfile[]
  }>({ key: '', profiles: NO_PROFILES })

  const profiles =
    profileState.key === profilesKey ? profileState.profiles : NO_PROFILES

  useEffect(() => {
    if (buddyIds.length === 0) return

    let active = true
    discoverService
      .getProfiles(buddyIds)
      .then((loaded) => {
        if (active) setProfileState({ key: profilesKey, profiles: loaded })
      })
      .catch(() => {
        // Without a projection a card falls back to generic wording.
        if (active) setProfileState({ key: profilesKey, profiles: NO_PROFILES })
      })

    return () => {
      active = false
    }
  }, [profilesKey, buddyIds])

  const items = useMemo(
    () => (userId ? withBuddies(state.activities, profiles, userId) : []),
    [state.activities, profiles, userId],
  )

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  return {
    items,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  }
}

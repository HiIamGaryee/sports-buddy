import { useCallback, useEffect, useMemo, useState } from 'react'

import { TEMPORAL_REFRESH_MS } from '@/constants/activities'
import { useAuth } from '@/hooks/use-auth'
import { activityService } from '@/services/activity/activity-service'
import { discoverService } from '@/services/discover/discover-service'
import type { Activity, ActivityWithBuddy } from '@/types/activity'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface ActivitiesState {
  key: string
  activities: Activity[]
  nextCursor: string | null
  isLoading: boolean
  isLoadingMore: boolean
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
 * A coarse clock for temporal classification.
 *
 * Upcoming/past only changes when a session ends, so ticking every second
 * would re-render every list in the app thousands of times to catch a
 * boundary a minute early. One minute is imperceptible here and costs almost
 * nothing.
 */
export function useCoarseNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TEMPORAL_REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return now
}

/**
 * One page of the signed-in user's activities, in one temporal direction.
 *
 * The time bound is applied by the QUERY, not by loading everything and
 * filtering — which is what keeps Home from surfacing yesterday's session and
 * what stops history growing unbounded.
 *
 * A one-time read on purpose: a confirmed activity is immutable, so there is
 * nothing to subscribe to. Refresh is explicit.
 *
 * Buddy details come from ONE batched `publicProfiles` query for the whole
 * page — never a read per row, and never `users/{uid}`.
 */
function useActivityList(direction: 'upcoming' | 'past') {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [reloadToken, setReloadToken] = useState(0)

  const requestKey = `${direction}#${userId ?? ''}#${reloadToken}`
  const [state, setState] = useState<ActivitiesState>({
    key: requestKey,
    activities: [],
    nextCursor: null,
    isLoading: userId !== null,
    isLoadingMore: false,
    error: '',
  })

  // Reset during render when the user or refresh token changes.
  if (state.key !== requestKey) {
    setState({
      key: requestKey,
      activities: [],
      nextCursor: null,
      isLoading: true,
      isLoadingMore: false,
      error: '',
    })
  }

  useEffect(() => {
    if (!userId) return

    let active = true
    const read =
      direction === 'upcoming'
        ? activityService.getUpcoming
        : activityService.getPast

    // Read once per load. The list is a snapshot of a moment, so the boundary
    // must not shift underneath a "Load more".
    read(userId, new Date())
      .then((page) => {
        if (!active) return
        setState({
          key: requestKey,
          activities: page.activities,
          nextCursor: page.nextCursor,
          isLoading: false,
          isLoadingMore: false,
          error: '',
        })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          key: requestKey,
          activities: [],
          nextCursor: null,
          isLoading: false,
          isLoadingMore: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "We couldn't load your activities.",
        })
      })

    return () => {
      active = false
    }
  }, [userId, requestKey, direction])

  const loadMore = useCallback(() => {
    if (!userId || !state.nextCursor || state.isLoadingMore) return

    setState((current) => ({ ...current, isLoadingMore: true }))
    const read =
      direction === 'upcoming'
        ? activityService.getUpcoming
        : activityService.getPast

    read(userId, new Date(), state.nextCursor)
      .then((page) => {
        setState((current) => ({
          ...current,
          // Merged by id, so a shifted boundary cannot duplicate a row.
          activities: [
            ...current.activities,
            ...page.activities.filter(
              (activity) =>
                !current.activities.some((entry) => entry.id === activity.id),
            ),
          ],
          nextCursor: page.nextCursor,
          isLoadingMore: false,
        }))
      })
      .catch(() => {
        setState((current) => ({
          ...current,
          isLoadingMore: false,
          nextCursor: null,
        }))
      })
  }, [userId, state.nextCursor, state.isLoadingMore, direction])

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
    isLoadingMore: state.isLoadingMore,
    hasMore: state.nextCursor !== null,
    error: state.error,
    loadMore,
    refresh,
  }
}

/** Sessions that have not finished, soonest first. */
export const useUpcomingActivities = () => useActivityList('upcoming')

/**
 * Sessions whose end time has passed, most recent first.
 *
 * PAST IS NOT COMPLETED. Nothing here knows whether anybody turned up.
 */
export const usePastActivities = () => useActivityList('past')

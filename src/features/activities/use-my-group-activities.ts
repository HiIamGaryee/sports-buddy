import { useCallback, useEffect, useMemo, useState } from 'react'

import { idsMentionedByGroupActivities } from '@/features/group-activities/use-group-activities'
import { useAuth } from '@/hooks/use-auth'
import { compareGroupActivities, isUpcomingGroupActivity } from '@/lib/group-activity'
import { groupActivityService } from '@/services/group-activity/group-activity-service'
import { discoverService } from '@/services/discover/discover-service'
import type { GroupActivity } from '@/types/group-activity'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface MyGroupActivitiesState {
  key: string
  hosted: GroupActivity[]
  joined: GroupActivity[]
  people: DiscoveryProfile[]
  isLoading: boolean
  error: string
}

const EMPTY: Omit<MyGroupActivitiesState, 'key' | 'isLoading' | 'error'> = {
  hosted: [],
  joined: [],
  people: [],
}

const soonestFirst = (activities: readonly GroupActivity[]) =>
  [...activities].sort(compareGroupActivities)

const latestFirst = (activities: readonly GroupActivity[]) =>
  [...activities].sort((a, b) => compareGroupActivities(b, a))

/**
 * The signed-in user's public group activities for the Activities page and
 * Home: activities they HOST and activities they JOINED — split by the
 * injected `now` into planned and past. Mirrors `useMyActivityPosts`.
 */
export function useMyGroupActivities(now: Date) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [reloadToken, setReloadToken] = useState(0)
  const requestKey = `${userId ?? ''}#${reloadToken}`
  const [state, setState] = useState<MyGroupActivitiesState>({
    key: '',
    ...EMPTY,
    isLoading: true,
    error: '',
  })

  useEffect(() => {
    if (!userId) return
    let active = true
    const key = `${userId}#${reloadToken}`

    Promise.all([groupActivityService.listMine(userId), groupActivityService.listJoined(userId)])
      .then(async ([hosted, joined]) => {
        const people = await discoverService
          .getProfiles(idsMentionedByGroupActivities([...hosted, ...joined]))
          .catch(() => [])
        if (active) setState({ key, hosted, joined, people, isLoading: false, error: '' })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          key,
          ...EMPTY,
          isLoading: false,
          error:
            loadError instanceof Error ? loadError.message : "We couldn't load your activities.",
        })
      })

    return () => {
      active = false
    }
  }, [userId, reloadToken])

  const people = useMemo(
    () => new Map(state.people.map((profile) => [profile.userId, profile])),
    [state.people],
  )

  const grouped = useMemo(() => {
    const upcoming = (activities: readonly GroupActivity[]) =>
      activities.filter((activity) => isUpcomingGroupActivity(activity, now))
    const ended = (activities: readonly GroupActivity[]) =>
      activities.filter((activity) => !isUpcomingGroupActivity(activity, now))

    return {
      hostedPlanned: soonestFirst(upcoming(state.hosted)),
      hostedPast: latestFirst(ended(state.hosted)),
      joinedPlanned: soonestFirst(upcoming(state.joined)),
      joinedPast: latestFirst(ended(state.joined)),
    }
  }, [state.hosted, state.joined, now])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const remove = useCallback(
    async (activityId: string) => {
      await groupActivityService.remove(activityId)
      refresh()
    },
    [refresh],
  )

  return {
    ...grouped,
    people,
    isLoading: state.isLoading && state.key !== requestKey,
    error: state.error,
    refresh,
    remove,
  }
}

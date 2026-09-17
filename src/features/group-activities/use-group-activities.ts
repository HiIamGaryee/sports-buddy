import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useSafety } from '@/hooks/use-safety'
import { groupActivityService } from '@/services/group-activity/group-activity-service'
import { discoverService } from '@/services/discover/discover-service'
import type { GroupActivity } from '@/types/group-activity'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface FeedState {
  key: number
  activities: GroupActivity[]
  people: DiscoveryProfile[]
  isLoading: boolean
  error: string
}

const loading = (key: number, previous?: FeedState): FeedState => ({
  key,
  activities: previous?.activities ?? [],
  people: previous?.people ?? [],
  isLoading: !previous || previous.activities.length === 0,
  error: '',
})

/** Every id a card can mention — organizer, whoever has joined. */
export const idsMentionedByGroupActivities = (activities: readonly GroupActivity[]) => [
  ...new Set(activities.flatMap((activity) => [activity.organizerId, ...activity.participantIds])),
]

/**
 * Upcoming public group activities plus the public profiles of everyone they
 * mention. Two reads per load: one batch of activities, then ONE batched
 * `publicProfiles` query. One-time, with an explicit `refresh`.
 *
 * Activities by someone the viewer blocked are dropped; the viewer's own
 * activities stay.
 */
export function useGroupActivities() {
  const { user } = useAuth()
  const { blockedIds } = useSafety()
  const [reloadToken, setReloadToken] = useState(0)
  const [feed, setFeed] = useState<FeedState>(() => loading(reloadToken))
  if (feed.key !== reloadToken) setFeed(loading(reloadToken, feed))

  useEffect(() => {
    let active = true
    const key = reloadToken

    groupActivityService
      .listUpcoming(new Date())
      .then(async (activities) => {
        const people = await discoverService
          .getProfiles(idsMentionedByGroupActivities(activities))
          .catch(() => [])
        if (active) setFeed({ key, activities, people, isLoading: false, error: '' })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setFeed({
          key,
          activities: [],
          people: [],
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : "We couldn't load activities.",
        })
      })

    return () => {
      active = false
    }
  }, [reloadToken])

  const people = useMemo(
    () => new Map(feed.people.map((profile) => [profile.userId, profile])),
    [feed.people],
  )

  const activities = useMemo(
    () => feed.activities.filter((activity) => !blockedIds.has(activity.organizerId)),
    [feed.activities, blockedIds],
  )

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  return {
    activities,
    people,
    currentUserId: user?.id ?? null,
    isLoading: feed.isLoading,
    error: feed.error,
    refresh,
  }
}

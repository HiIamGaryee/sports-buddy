import { useCallback, useEffect, useMemo, useState } from 'react'

import { idsMentionedBy } from '@/features/discover/use-activity-posts'
import { useAuth } from '@/hooks/use-auth'
import {
  compareActivityPosts,
  isPostFull,
  isUpcomingPost,
} from '@/lib/activity-post'
import { activityPostService } from '@/services/activity-post/activity-post-service'
import { discoverService } from '@/services/discover/discover-service'
import type { ActivityPost } from '@/types/activity-post'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface MyPostsState {
  key: string
  created: ActivityPost[]
  joined: ActivityPost[]
  requested: ActivityPost[]
  invited: ActivityPost[]
  people: DiscoveryProfile[]
  isLoading: boolean
  error: string
}

const EMPTY: Omit<MyPostsState, 'key' | 'isLoading' | 'error'> = {
  created: [],
  joined: [],
  requested: [],
  invited: [],
  people: [],
}

const soonestFirst = (posts: readonly ActivityPost[]) =>
  [...posts].sort(compareActivityPosts)

const latestFirst = (posts: readonly ActivityPost[]) =>
  [...posts].sort((a, b) => compareActivityPosts(b, a))

/**
 * The signed-in user's Discover activities for the Activities page and Home:
 * posts they CREATED, posts they JOINED, posts they are still waiting to be
 * approved for, and private invites from a buddy — split by the injected
 * `now` into planned and past.
 *
 * A post whose one spot is taken is a CONFIRMED session for both people in
 * it, so it is grouped with sessions agreed through Plan Together.
 *
 * Four scoped queries (`authorId ==`, `joinedIds array-contains`,
 * `pendingIds array-contains`, `invitedId ==`) plus ONE batched
 * `publicProfiles` read for every person those posts mention. One-time, with
 * an explicit `refresh`.
 *
 * Like confirmed sessions, "past" only means the start time has passed; it
 * says nothing about whether anyone played.
 */
export function useMyActivityPosts(now: Date) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [reloadToken, setReloadToken] = useState(0)
  const requestKey = `${userId ?? ''}#${reloadToken}`
  const [state, setState] = useState<MyPostsState>({
    key: '',
    ...EMPTY,
    isLoading: true,
    error: '',
  })

  useEffect(() => {
    if (!userId) return
    let active = true
    const key = `${userId}#${reloadToken}`

    Promise.all([
      activityPostService.listMine(userId),
      activityPostService.listJoinedAndRequested(userId),
    ])
      .then(async ([created, { joined, requested, invited }]) => {
        const people = await discoverService
          .getProfiles(
            idsMentionedBy([...created, ...joined, ...requested, ...invited]),
          )
          .catch(() => [])
        if (active) {
          setState({
            key,
            created,
            joined,
            requested,
            invited,
            people,
            isLoading: false,
            error: '',
          })
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          key,
          ...EMPTY,
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
  }, [userId, reloadToken])

  const people = useMemo(
    () => new Map(state.people.map((profile) => [profile.userId, profile])),
    [state.people],
  )

  const grouped = useMemo(() => {
    const upcoming = (posts: readonly ActivityPost[]) =>
      posts.filter((post) => isUpcomingPost(post, now))
    const ended = (posts: readonly ActivityPost[]) =>
      posts.filter((post) => !isUpcomingPost(post, now))

    const createdPlanned = upcoming(state.created)

    return {
      /** Everything you posted that has not started, full or not. */
      createdPlanned: soonestFirst(createdPlanned),
      /** Your posts still waiting for someone to take the spot. */
      openPlanned: soonestFirst(createdPlanned.filter((post) => !isPostFull(post))),
      /** Upcoming sessions with both people in: your filled posts + joined. */
      confirmedPlanned: soonestFirst([
        ...createdPlanned.filter(isPostFull),
        ...upcoming(state.joined),
      ]),
      waitingPlanned: soonestFirst(upcoming(state.requested)),
      invitations: soonestFirst(upcoming(state.invited)),
      createdPast: latestFirst(ended(state.created)),
      joinedPast: latestFirst(ended(state.joined)),
    }
  }, [state.created, state.joined, state.requested, state.invited, now])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const remove = useCallback(
    async (postId: string) => {
      await activityPostService.remove(postId)
      refresh()
    },
    [refresh],
  )

  return {
    ...grouped,
    people,
    // Only the FIRST load blanks the sections; a refresh after joining or
    // approving keeps the cards on screen until the new data arrives.
    isLoading: state.isLoading && state.key !== requestKey,
    error: state.error,
    refresh,
    remove,
  }
}

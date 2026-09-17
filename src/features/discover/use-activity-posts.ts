import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useSafety } from '@/hooks/use-safety'
import { activityPostService } from '@/services/activity-post/activity-post-service'
import { discoverService } from '@/services/discover/discover-service'
import type { ActivityPost } from '@/types/activity-post'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface FeedState {
  key: number
  posts: ActivityPost[]
  people: DiscoveryProfile[]
  isLoading: boolean
  error: string
}

const loading = (key: number, previous?: FeedState): FeedState => ({
  key,
  // Keep showing the last list while it reloads after a join or approval.
  posts: previous?.posts ?? [],
  people: previous?.people ?? [],
  isLoading: !previous || previous.posts.length === 0,
  error: '',
})

/**
 * Every id a post card can mention — author, whoever is in, whoever is
 * waiting, whoever was invited — so ONE batched `publicProfiles` read names
 * them all.
 */
export const idsMentionedBy = (posts: readonly ActivityPost[]) => [
  ...new Set(
    posts.flatMap((post) => [
      post.authorId,
      ...post.joinedIds,
      ...post.pendingIds,
      ...(post.invitedId ? [post.invitedId] : []),
    ]),
  ),
]

/**
 * Upcoming Discover posts plus the public profiles of everyone they mention.
 *
 * Two reads per load and no more: one batch of posts, then ONE batched
 * `publicProfiles` query — never a read per card, and never `users/{uid}`.
 * One-time, with an explicit `refresh` (also called after every join,
 * approval or removal so the card shows its new state).
 *
 * Posts by someone the viewer blocked are dropped. The viewer's OWN posts
 * stay, so what you post shows up in the list.
 */
export function useActivityPosts() {
  const { user } = useAuth()
  const { blockedIds } = useSafety()
  const [reloadToken, setReloadToken] = useState(0)
  const [feed, setFeed] = useState<FeedState>(() => loading(reloadToken))
  if (feed.key !== reloadToken) setFeed(loading(reloadToken, feed))

  useEffect(() => {
    let active = true
    const key = reloadToken

    activityPostService
      .listUpcoming(new Date())
      .then(async (posts) => {
        // A failed name lookup degrades to "Sports buddy"; the posts still show.
        const people = await discoverService
          .getProfiles(idsMentionedBy(posts))
          .catch(() => [])
        if (active) setFeed({ key, posts, people, isLoading: false, error: '' })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setFeed({
          key,
          posts: [],
          people: [],
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "We couldn't load activities.",
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

  const posts = useMemo(
    () => feed.posts.filter((post) => !blockedIds.has(post.authorId)),
    [feed.posts, blockedIds],
  )

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const remove = useCallback(
    async (postId: string) => {
      await activityPostService.remove(postId)
      refresh()
    },
    [refresh],
  )

  return {
    posts,
    people,
    currentUserId: user?.id ?? null,
    isLoading: feed.isLoading,
    error: feed.error,
    refresh,
    remove,
  }
}

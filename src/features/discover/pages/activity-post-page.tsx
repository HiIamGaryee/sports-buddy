import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCoarseNow } from '@/features/activities/use-activities'
import { ActivityPostCard } from '@/features/discover/components/activity-post-card'
import { idsMentionedBy } from '@/features/discover/use-activity-posts'
import { useAuth } from '@/hooks/use-auth'
import { useSafety } from '@/hooks/use-safety'
import { validDocumentId } from '@/lib/ids'
import { clearReturnPath } from '@/routes/return-path'
import { ROUTES } from '@/routes/routes'
import { activityPostService } from '@/services/activity-post/activity-post-service'
import { discoverService } from '@/services/discover/discover-service'
import type { ActivityPost } from '@/types/activity-post'
import type { DiscoveryProfile } from '@/types/discovery-profile'

type PageState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'ready'; post: ActivityPost; people: DiscoveryProfile[] }

/**
 * `/discover/activity/:postId` — one activity, which is where a share link
 * and a chat invite land. Public and link-only posts open for any member; a
 * private invite only for its two people. Missing, private and blocked all
 * read the same "unavailable", so a guessed id leaks nothing.
 */
export function ActivityPostPage() {
  const { postId: rawPostId } = useParams<{ postId: string }>()
  const postId = validDocumentId(rawPostId)
  const now = useCoarseNow()
  const { user } = useAuth()
  const { blockedIds } = useSafety()
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<PageState>({ status: 'loading' })

  // The share link has been followed; do not resume it again after sign-in.
  useEffect(() => clearReturnPath(), [])

  useEffect(() => {
    if (!postId) return
    let active = true
    activityPostService
      .getById(postId)
      .then(async (post) => {
        if (!post) {
          if (active) setState({ status: 'unavailable' })
          return
        }
        const people = await discoverService
          .getProfiles(idsMentionedBy([post]))
          .catch(() => [])
        if (active) setState({ status: 'ready', post, people })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'error',
          message:
            error instanceof Error ? error.message : "We couldn't load this activity.",
        })
      })
    return () => {
      active = false
    }
  }, [postId, reloadToken])

  const people = useMemo(
    () =>
      new Map(
        (state.status === 'ready' ? state.people : []).map((profile) => [
          profile.userId,
          profile,
        ]),
      ),
    [state],
  )

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const remove = useCallback(async (id: string) => {
    await activityPostService.remove(id)
    setState({ status: 'unavailable' })
  }, [])

  const header = <AppHeader title="Activity" size="default" showBack />

  const unavailable = (
    <EmptyState
      title="This activity is unavailable."
      description="It may have been removed, or it was shared privately with someone else."
      action={
        <Button variant="outline" asChild>
          <Link to={ROUTES.discover}>Browse activities</Link>
        </Button>
      }
    />
  )

  let body: React.ReactNode
  if (!postId || state.status === 'unavailable') {
    body = unavailable
  } else if (state.status === 'loading') {
    body = <Skeleton className="h-80 w-full rounded-2xl" />
  } else if (state.status === 'error') {
    body = <ErrorState title={state.message} onRetry={refresh} />
  } else if (
    blockedIds.has(state.post.authorId) ||
    // The rules already refuse this in Firebase mode; kept here too so every
    // backend shows a private invite only to its two people.
    (state.post.visibility === 'invite' &&
      user?.id !== state.post.authorId &&
      user?.id !== state.post.invitedId)
  ) {
    body = unavailable
  } else {
    body = (
      <ActivityPostCard
        post={state.post}
        people={people}
        now={now}
        onChanged={refresh}
        onRemove={remove}
      />
    )
  }

  return (
    <>
      {header}
      <PageContainer size="default">{body}</PageContainer>
    </>
  )
}

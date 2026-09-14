import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCoarseNow } from '@/features/activities/use-activities'
import { GroupActivityCard } from '@/features/group-activities/components/group-activity-card'
import { idsMentionedByGroupActivities } from '@/features/group-activities/use-group-activities'
import { useSafety } from '@/hooks/use-safety'
import { validDocumentId } from '@/lib/ids'
import { clearReturnPath } from '@/routes/return-path'
import { ROUTES } from '@/routes/routes'
import { discoverService } from '@/services/discover/discover-service'
import { groupActivityService } from '@/services/group-activity/group-activity-service'
import type { GroupActivity } from '@/types/group-activity'
import type { DiscoveryProfile } from '@/types/discovery-profile'

type PageState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'ready'; activity: GroupActivity; people: DiscoveryProfile[] }

/**
 * `/discover/group-activities/:activityId` — one public group activity,
 * which is where a share link and a chat link land. Always public, so any
 * signed-in member can open it; a missing id and one blocked-away read the
 * same "unavailable".
 */
export function GroupActivityDetailPage() {
  const { activityId: rawActivityId } = useParams<{ activityId: string }>()
  const activityId = validDocumentId(rawActivityId)
  const now = useCoarseNow()
  const { blockedIds } = useSafety()
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<PageState>({ status: 'loading' })

  // The share link has been followed; do not resume it again after sign-in.
  useEffect(() => clearReturnPath(), [])

  useEffect(() => {
    if (!activityId) return
    let active = true
    groupActivityService
      .getById(activityId)
      .then(async (activity) => {
        if (!activity) {
          if (active) setState({ status: 'unavailable' })
          return
        }
        const people = await discoverService
          .getProfiles(idsMentionedByGroupActivities([activity]))
          .catch(() => [])
        if (active) setState({ status: 'ready', activity, people })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : "We couldn't load this activity.",
        })
      })
    return () => {
      active = false
    }
  }, [activityId, reloadToken])

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
    await groupActivityService.remove(id)
    setState({ status: 'unavailable' })
  }, [])

  const header = <AppHeader title="Activity" size="default" showBack />

  const unavailable = (
    <EmptyState
      title="This activity is unavailable."
      description="It may have been removed."
      action={
        <Button variant="outline" asChild>
          <Link to={ROUTES.discover}>Browse activities</Link>
        </Button>
      }
    />
  )

  let body: React.ReactNode
  if (!activityId || state.status === 'unavailable') {
    body = unavailable
  } else if (state.status === 'loading') {
    body = <Skeleton className="h-80 w-full rounded-2xl" />
  } else if (state.status === 'error') {
    body = <ErrorState title={state.message} onRetry={refresh} />
  } else if (blockedIds.has(state.activity.organizerId)) {
    body = unavailable
  } else {
    body = (
      <GroupActivityCard
        activity={state.activity}
        people={people}
        now={now}
        onChanged={refresh}
        onRemove={remove}
        linkToDetail={false}
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

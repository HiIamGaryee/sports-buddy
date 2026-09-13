import { History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import clipboardIllustration from '@/assets/svg/clipboard-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { SectionHeader } from '@/components/common/section-header'
import { ErrorState } from '@/components/common/error-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityCard } from '@/features/activities/components/activity-card'
import { ActivityHistory } from '@/features/activities/components/activity-history'
import { useMyActivityPosts } from '@/features/activities/use-my-activity-posts'
import { ActivityPostCard } from '@/features/discover/components/activity-post-card'
import {
  useCoarseNow,
  usePastActivities,
  useUpcomingActivities,
} from '@/features/activities/use-activities'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/routes/routes'
import type { ActivityWithBuddy } from '@/types/activity'
import type { ActivityPost } from '@/types/activity-post'
import type { DiscoveryProfile } from '@/types/discovery-profile'

const SKELETON_CARDS = [0, 1, 2]

/** Sizes from the cards, not from a per-breakpoint column count. */
const CARD_GRID = 'grid-cards'

/**
 * Planned reads top to bottom as "what needs me, then what is happening":
 *
 *  - invitations a buddy sent you, waiting for your answer,
 *  - your posts still looking for someone, and requests you are waiting on,
 *  - CONFIRMED sessions — a Discover post whose spot is taken (yours, or one
 *    you joined) beside sessions agreed through Plan Together.
 *
 * Created by me shows what you started; Past shows everything once its time
 * has gone.
 */
export function ActivitiesPage() {
  const { user } = useAuth()
  const now = useCoarseNow()
  const upcoming = useUpcomingActivities()
  const past = usePastActivities()
  const myPosts = useMyActivityPosts(now)
  const postProps = {
    people: myPosts.people,
    now,
    isLoading: myPosts.isLoading,
    error: myPosts.error,
    onRetry: myPosts.refresh,
    onRemove: myPosts.remove,
  }
  const createdItems = upcoming.items.filter(
    ({ activity }) => activity.createdBy === user?.id,
  )

  return (
    <>
      <AppHeader
        title="Activities"
        subtitle="Activities you posted and sessions you planned with buddies."
        size="wide"
      />
      <PageContainer size="wide">
        <Tabs defaultValue="planned">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="planned" className="flex-1 sm:flex-none sm:px-6">
              Planned
            </TabsTrigger>
            <TabsTrigger value="created" className="flex-1 sm:flex-none sm:px-6">
              Created by me
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 sm:flex-none sm:px-6">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planned" className="flex flex-col gap-6 pt-5">
            <PostedActivities
              title="Invitations"
              posts={myPosts.invitations}
              {...postProps}
            />
            <PostedActivities
              title="Looking for a buddy"
              posts={myPosts.openPlanned}
              {...postProps}
            />
            <PostedActivities
              title="Waiting for approval"
              posts={myPosts.waitingPlanned}
              {...postProps}
            />
            <section className="flex flex-col gap-4">
              <SectionHeader title="Confirmed sessions" />
              <ActivityTabBody
                {...upcoming}
                isLoading={upcoming.isLoading || myPosts.isLoading}
                extraCount={myPosts.confirmedPlanned.length}
                emptyIllustration={clipboardIllustration}
                emptyTitle="No confirmed sessions yet."
                emptyDescription="Join an activity on Discover, or plan a session with a buddy from your chat."
                emptyAction={
                  <Button variant="outline" asChild className="px-8">
                    <Link to={ROUTES.discover}>Find a Buddy</Link>
                  </Button>
                }
              >
                <div className={CARD_GRID}>
                  {myPosts.confirmedPlanned.map((post) => (
                    <ActivityPostCard
                      key={post.id}
                      post={post}
                      people={myPosts.people}
                      now={now}
                      onChanged={myPosts.refresh}
                      onRemove={myPosts.remove}
                    />
                  ))}
                  {upcoming.items.map((item) => (
                    <ActivityCard key={item.activity.id} item={item} now={now} />
                  ))}
                </div>
              </ActivityTabBody>
            </section>
          </TabsContent>

          <TabsContent value="created" className="flex flex-col gap-6 pt-5">
            <PostedActivities
              title="Posted by you"
              posts={myPosts.createdPlanned}
              {...postProps}
            />
            {myPosts.createdPlanned.length > 0 && (
              <SectionHeader title="Sessions you confirmed" />
            )}
            <ActivityTabBody
              {...upcoming}
              items={createdItems}
              emptyIllustration={clipboardIllustration}
              emptyTitle={
                myPosts.createdPlanned.length > 0
                  ? 'No confirmed sessions yet.'
                  : 'No activities created yet.'
              }
              emptyDescription="Post an activity on Discover, or plan a session with a buddy from your chat."
              emptyAction={
                <Button variant="outline" asChild className="px-8">
                  <Link to={ROUTES.postActivity}>Post an activity</Link>
                </Button>
              }
            >
              <div className={CARD_GRID}>
                {createdItems.map((item) => (
                  <ActivityCard key={item.activity.id} item={item} now={now} />
                ))}
              </div>
            </ActivityTabBody>
          </TabsContent>

          <TabsContent value="past" className="flex flex-col gap-6 pt-5">
            <PostedActivities
              title="Your past posts"
              posts={myPosts.createdPast}
              {...postProps}
            />
            <PostedActivities
              title="Past activities you joined"
              posts={myPosts.joinedPast}
              {...postProps}
            />
            {myPosts.createdPast.length + myPosts.joinedPast.length > 0 && (
              <SectionHeader title="Past sessions" />
            )}
            <ActivityTabBody
              {...past}
              emptyIcon={History}
              emptyTitle="No past activities yet."
              /* Careful wording: an activity lands here because its end time
                 passed, which says nothing about whether anyone went. */
              emptyDescription="Your confirmed sessions appear here after their scheduled time."
            >
              <ActivityHistory items={past.items} now={now} />
            </ActivityTabBody>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  )
}

/**
 * One group of Discover activities for a tab (created, joined, past). Renders
 * nothing when the group is empty, so a tab with only confirmed sessions
 * looks exactly as it did.
 */
function PostedActivities({
  title,
  posts,
  people,
  now,
  isLoading,
  error,
  onRetry,
  onRemove,
}: {
  title: string
  posts: readonly ActivityPost[]
  people: ReadonlyMap<string, DiscoveryProfile>
  now: Date
  isLoading: boolean
  error: string
  onRetry: () => void
  onRemove: (postId: string) => Promise<void>
}) {
  if (isLoading || (posts.length === 0 && !error)) return null

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={title} />
      {error ? (
        <ErrorState title={error} onRetry={onRetry} />
      ) : (
        <div className={CARD_GRID}>
          {posts.map((post) => (
            <ActivityPostCard
              key={post.id}
              post={post}
              people={people}
              now={now}
              onChanged={onRetry}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Loading, error, empty, content and "Load more" — identical for both tabs,
 * so the page states cannot drift apart between Upcoming and Past.
 */
function ActivityTabBody({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  loadMore,
  refresh,
  emptyIcon,
  emptyIllustration,
  emptyTitle,
  emptyDescription,
  emptyAction,
  extraCount = 0,
  children,
}: {
  items: readonly ActivityWithBuddy[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string
  loadMore: () => void
  refresh: () => void
  emptyIcon?: LucideIcon
  emptyIllustration?: string
  emptyTitle: string
  emptyDescription: string
  emptyAction?: React.ReactNode
  /** Other cards rendered in `children` that also make the tab non-empty. */
  extraCount?: number
  children: React.ReactNode
}) {
  if (isLoading) {
    return (
      <div className={CARD_GRID}>
        {SKELETON_CARDS.map((key) => (
          <Skeleton key={key} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) return <ErrorState title={error} onRetry={refresh} />

  if (items.length + extraCount === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        illustration={emptyIllustration}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {children}
      {hasMore && (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={isLoadingMore}
          className="self-center px-8"
        >
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}

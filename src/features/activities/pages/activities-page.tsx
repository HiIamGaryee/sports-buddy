import { History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import clipboardIllustration from '@/assets/svg/clipboard-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityCard } from '@/features/activities/components/activity-card'
import { ActivityHistory } from '@/features/activities/components/activity-history'
import {
  useCoarseNow,
  usePastActivities,
  useUpcomingActivities,
} from '@/features/activities/use-activities'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/routes/routes'
import type { ActivityWithBuddy } from '@/types/activity'

const SKELETON_CARDS = [0, 1, 2]

/** Sizes from the cards, not from a per-breakpoint column count. */
const CARD_GRID = 'grid-cards'

/**
 * Planned and created sessions use the same upcoming source, while Past uses
 * its temporal query. Every view keeps the same cards and empty states.
 */
export function ActivitiesPage() {
  const { user } = useAuth()
  const now = useCoarseNow()
  const upcoming = useUpcomingActivities()
  const past = usePastActivities()
  const createdItems = upcoming.items.filter(
    ({ activity }) => activity.createdBy === user?.id,
  )

  return (
    <>
      <AppHeader
        title="Activities"
        subtitle="Your planned sessions and activities you created."
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

          <TabsContent value="planned" className="pt-5">
            <ActivityTabBody
              {...upcoming}
              emptyIllustration={clipboardIllustration}
              emptyTitle="No upcoming activities."
              emptyDescription="Find a sports buddy and plan your next session."
              emptyAction={
                <Button variant="outline" asChild className="px-8">
                  <Link to={ROUTES.discover}>Find a Buddy</Link>
                </Button>
              }
            >
              <div className={CARD_GRID}>
                {upcoming.items.map((item) => (
                  <ActivityCard key={item.activity.id} item={item} now={now} />
                ))}
              </div>
            </ActivityTabBody>
          </TabsContent>

          <TabsContent value="created" className="pt-5">
            <ActivityTabBody
              {...upcoming}
              items={createdItems}
              emptyIllustration={clipboardIllustration}
              emptyTitle="No activities created yet."
              emptyDescription="Use Plan activity in Discover to set up a session with a sports buddy."
              emptyAction={
                <Button variant="outline" asChild className="px-8">
                  <Link to={ROUTES.discover}>Plan an activity</Link>
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

          <TabsContent value="past" className="pt-5">
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

  if (items.length === 0) {
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

import { CalendarDays, History } from 'lucide-react'
import { Link } from 'react-router-dom'

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
import { ROUTES } from '@/routes/routes'
import type { ActivityWithBuddy } from '@/types/activity'

const SKELETON_CARDS = [0, 1, 2]

/** Sizes from the cards, not from a per-breakpoint column count. */
const CARD_GRID = 'grid-cards'

/**
 * Both tabs are real from STEP 13. They differ only in which time bound the
 * query used — the same card, the same states, the same shell.
 */
export function ActivitiesPage() {
  const now = useCoarseNow()
  const upcoming = useUpcomingActivities()
  const past = usePastActivities()

  return (
    <>
      <AppHeader
        title="Activities"
        subtitle="Sessions you and your buddies confirmed."
        size="wide"
      />
      <PageContainer size="wide">
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="flex-1 sm:flex-none sm:px-6">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 sm:flex-none sm:px-6">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="pt-5">
            <ActivityTabBody
              {...upcoming}
              emptyIcon={CalendarDays}
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
  emptyIcon: typeof CalendarDays
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

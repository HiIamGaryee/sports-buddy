import { CalendarDays, History } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityCard } from '@/features/activities/components/activity-card'
import { useUpcomingActivities } from '@/features/activities/use-activities'
import { ROUTES } from '@/routes/routes'

const ACTIVITY_TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
] as const

const SKELETON_CARDS = [0, 1, 2]

/** 1 column on a phone, 2 from `md`, 3 on a large desktop. */
const CARD_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

export function ActivitiesPage() {
  const { items, isLoading, error, refresh } = useUpcomingActivities()

  return (
    <>
      <AppHeader
        title="Activities"
        subtitle="Sessions you and your buddies confirmed."
        size="wide"
      />
      <PageContainer size="wide">
        <Tabs defaultValue={ACTIVITY_TABS[0].value}>
          <TabsList className="w-full sm:w-auto">
            {ACTIVITY_TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 sm:flex-none sm:px-6"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="upcoming" className="pt-5">
            {isLoading && (
              <div className={CARD_GRID}>
                {SKELETON_CARDS.map((key) => (
                  <Skeleton key={key} className="h-36 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {!isLoading && error && (
              <div className="flex flex-col items-start gap-4">
                <EmptyState
                  icon={CalendarDays}
                  title={error}
                  description="Something went wrong on our side, not yours."
                  className="w-full"
                />
                <Button
                  variant="outline"
                  onClick={refresh}
                  className="sm:px-8"
                >
                  Try again
                </Button>
              </div>
            )}

            {!isLoading && !error && items.length === 0 && (
              <div className="flex flex-col items-start gap-4">
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming activities."
                  description="Find a sports buddy and plan your first session."
                  className="w-full"
                />
                <Button variant="outline" asChild className="sm:px-8">
                  <Link to={ROUTES.discover}>Find a Buddy</Link>
                </Button>
              </div>
            )}

            {!isLoading && !error && items.length > 0 && (
              <div className={CARD_GRID}>
                {items.map((item) => (
                  <ActivityCard key={item.activity.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completion is not implemented, so this stays honestly empty
              rather than showing invented history. */}
          <TabsContent value="past" className="pt-5">
            <EmptyState
              icon={History}
              title="No completed activities yet."
              description="Finished sessions will appear here once activity completion is built."
              className="w-full"
            />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  )
}

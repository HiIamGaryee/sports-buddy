import { RefreshCw, Users } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ActiveFilterChips } from '@/features/discover/components/active-filter-chips'
import { BuddyCard } from '@/features/discover/components/buddy-card'
import { DiscoverFilterSheet } from '@/features/discover/components/discover-filter-sheet'
import { useDiscover } from '@/features/discover/use-discover'
import { countActiveFilters } from '@/lib/discover-filters'

const SKELETON_CARDS = [0, 1, 2]

export function DiscoverPage() {
  const {
    buddies,
    totalCandidates,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    refresh,
  } = useDiscover()

  const activeCount = countActiveFilters(filters)

  return (
    <>
      <AppHeader
        title="Discover"
        subtitle="Based on your sports, availability and preferences."
        action={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh sports buddies"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className="size-5" />
          </Button>
        }
      />
      <PageContainer>
        <div className="flex items-center justify-between gap-3">
          <span className="text-body-small text-muted-foreground">
            {isLoading
              ? 'Looking for buddies…'
              : `${buddies.length} ${buddies.length === 1 ? 'buddy' : 'buddies'}`}
          </span>
          <DiscoverFilterSheet
            filters={filters}
            activeCount={activeCount}
            onApply={setFilters}
            onReset={resetFilters}
          />
        </div>

        {!isLoading && !error && <ActiveFilterChips filters={filters} />}

        {isLoading && (
          <div className="flex flex-col gap-4">
            {SKELETON_CARDS.map((key) => (
              <Card key={key}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-14 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-6 w-40 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col gap-4">
            <EmptyState
              icon={Users}
              title={error}
              description="Something went wrong on our side, not yours."
            />
            <Button size="lg" variant="outline" onClick={refresh}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && buddies.length === 0 && (
          <>
            {totalCandidates === 0 ? (
              <EmptyState
                icon={Users}
                title="It's quiet here for now."
                description="Try again soon as more Sports Buddy members join your area."
              />
            ) : (
              <div className="flex flex-col gap-4">
                <EmptyState
                  icon={Users}
                  title="No sports buddies found."
                  description="Try changing your filters or widening what you're looking for."
                />
                <Button size="lg" variant="outline" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>
            )}
          </>
        )}

        {!isLoading &&
          !error &&
          buddies.map((buddy) => (
            <BuddyCard key={buddy.profile.userId} buddy={buddy} />
          ))}
      </PageContainer>
    </>
  )
}

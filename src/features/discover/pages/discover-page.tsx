import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import compassIllustration from '@/assets/svg/compas-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { SectionHeader } from '@/components/common/section-header'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AddDiscoverDialog } from '@/features/discover/components/add-discover-dialog'
import { SPORTS } from '@/constants/sports'
import { OpportunityCard } from '@/features/discover/components/opportunity-card'
import { useDiscover } from '@/features/discover/use-discover'
import discoverList from '@/data/discover-list.json'
import type { DiscoverItem } from '@/types/discover-item'

const SKELETON_CARDS = [0, 1, 2, 3]

/** 1 column on a phone, 2 from `sm`, 3 on a large desktop. */
const CARD_GRID = 'grid-cards'

export function DiscoverPage() {
  const { incoming, suggested, isLoading, error, refresh } = useDiscover()
  const [location, setLocation] = useState(ALL)
  const [place, setPlace] = useState(ALL)
  const [activity, setActivity] = useState(ALL)
  const [skill, setSkill] = useState(ALL)
  const [buddyType, setBuddyType] = useState(ALL)
  const [distance, setDistance] = useState(ALL)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)
  const [addDiscoverOpen, setAddDiscoverOpen] = useState(false)

  const activeCount = countActiveFilters(filters)

  return (
    <>
      <AppHeader
        title="Discover"
        subtitle="See what they play. Connect to reveal the person."
        size="wide"
        action={<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setAddDiscoverOpen(true)}><img src={calendarIcon} alt="" className="size-4" />Add new discover</Button><Button variant="ghost" size="icon-sm" aria-label="Refresh matches" onClick={refresh} disabled={isLoading}><RefreshCw className="size-5" /></Button></div>}
      />
      <PageContainer size="wide">
        {/* Filters live in a persistent sidebar from `lg`, and in a bottom
            sheet below it. Same state, one implementation. */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <DiscoverFilterPanel
            filters={filters}
            activeCount={activeCount}
            onApply={setFilters}
            onReset={resetFilters}
            className="hidden w-nav-column shrink-0 lg:sticky lg:top-6 lg:block"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-small text-muted-foreground">
                {isLoading
                  ? 'Looking for buddies…'
                  : `${visibleCount} ${visibleCount === 1 ? 'buddy' : 'buddies'}`}
              </span>
              <DiscoverFilterSheet
                filters={filters}
                activeCount={activeCount}
                onApply={setFilters}
                onReset={resetFilters}
                className="lg:hidden"
              />
            </div>

            {!isLoading && !error && (
              <ActiveFilterChips filters={filters} className="lg:hidden" />
            )}

            {isLoading && (
              <div className={CARD_GRID}>
                {SKELETON_CARDS.map((key) => (
                  <Card key={key}>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-14 shrink-0 rounded-full" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
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
              <ErrorState title={error} onRetry={refresh} />
            )}

            {!isLoading && !error && visibleCount === 0 && (
              <EmptyState
                illustration={compassIllustration}
                title={
                  totalCandidates === 0
                    ? "It's quiet here for now."
                    : 'No sports buddies found.'
                }
                description={
                  totalCandidates === 0
                    ? 'Check back soon as more Sports Buddy members join your area.'
                    : "Try changing your filters or widening what you're looking for."
                }
                action={
                  totalCandidates > 0 && (
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="px-8"
                    >
                      Reset filters
                    </Button>
                  )
                }
              />
            )}

            {!isLoading && !error && incoming.length > 0 && (
              <section className="flex flex-col gap-4">
                <SectionHeader title="Wants to connect" />
                <div className={CARD_GRID}>
                  {incoming.map((buddy) => (
                    <BuddyCard key={buddy.profile.userId} buddy={buddy} />
                  ))}
                </div>
              </section>
            )}

            {!isLoading && !error && suggested.length > 0 && (
              <section className="flex flex-col gap-4">
                {incoming.length > 0 && <SectionHeader title="For you" />}
                <div className={CARD_GRID}>
                  {suggested.map((buddy) => (
                    <BuddyCard
                      key={buddy.profile.userId}
                      buddy={buddy}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </PageContainer>
      <AddDiscoverDialog open={addDiscoverOpen} onOpenChange={setAddDiscoverOpen} />
    </>
  )
}

import { Check, LockKeyhole, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import general from '@/data/general.json'
import { DiscoverFilterPanel } from '@/features/discover/components/discover-filter-panel'
import { DiscoverFilterSheet } from '@/features/discover/components/discover-filter-sheet'
import { canUseAdvancedDiscoverFilters } from '@/lib/capabilities'
import { countActiveFilters } from '@/lib/discover-filters'
import { ROUTES } from '@/routes/routes'
import type { DiscoverFilters } from '@/types/discover'
import type { SubscriptionState } from '@/types/subscription'

const FILTER_COPY = general.discover.premiumFilters

function PremiumFilterToolkit({ locked }: { locked: boolean }) {
  return (
    <Card variant="subtle" size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-title text-card-foreground">Premium search toolkit</span>
              <p className="text-body-small text-muted-foreground">
                {locked
                  ? FILTER_COPY.description
                  : 'Your Buddy+ search toolkit is ready for more precise discovery.'}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-caption text-primary">
            {FILTER_COPY.items.length} tools
          </span>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {FILTER_COPY.items.map(({ id, label, description }) => (
            <div
              key={id}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-subtle px-3 py-2"
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${locked ? 'bg-muted text-muted-foreground' : 'bg-primary/14 text-primary'}`}
              >
                {locked ? (
                  <LockKeyhole className="size-3" aria-hidden />
                ) : (
                  <Check className="size-3.5" aria-hidden />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body-small font-semibold text-card-foreground">{label}</span>
                <span className="truncate text-caption text-muted-foreground">{description}</span>
              </span>
            </div>
          ))}
        </div>

        {locked && (
          <Button variant="outline" size="sm" asChild className="self-start">
            <Link to={ROUTES.paywall}>
              <Sparkles className="size-4" aria-hidden />
              {FILTER_COPY.upgradeLabel}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function PremiumDiscoverFilters({
  subscriptionState,
  filters,
  onApply,
  onReset,
}: {
  subscriptionState: SubscriptionState
  filters: DiscoverFilters
  onApply: (filters: DiscoverFilters) => void
  onReset: () => void
}) {
  if (!FILTER_COPY.enabled) return null

  if (!canUseAdvancedDiscoverFilters(subscriptionState)) {
    return <PremiumFilterToolkit locked />
  }

  const activeCount = countActiveFilters(filters)

  return (
    <>
      <PremiumFilterToolkit locked={false} />
      <DiscoverFilterSheet
        filters={filters}
        activeCount={activeCount}
        onApply={onApply}
        onReset={onReset}
        className="lg:hidden"
      />
      <DiscoverFilterPanel
        filters={filters}
        activeCount={activeCount}
        onApply={onApply}
        onReset={onReset}
        className="hidden rounded-2xl border border-border bg-surface-subtle p-5 lg:block"
      />
    </>
  )
}

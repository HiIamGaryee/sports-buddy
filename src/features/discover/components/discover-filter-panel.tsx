import { Button } from '@/components/ui/button'
import { DiscoverFilterFields } from '@/features/discover/components/discover-filters'
import type { DiscoverFilters } from '@/types/discover'

/**
 * DESKTOP filters (≥1024px): a persistent sidebar that applies immediately.
 * A bottom sheet on a 1440px screen is a phone habit, not a desktop pattern.
 *
 * There is no Apply button here because there is nothing to dismiss — the
 * feed is beside the controls, so a change is visible at once. Reset returns
 * to the saved discovery preferences, exactly as it does in the sheet.
 *
 * The caller makes this sticky: it is the flex item, and a sticky child of a
 * non-stretching item has no room to travel.
 */
export function DiscoverFilterPanel({
  filters,
  activeCount,
  onApply,
  onReset,
  className,
}: {
  filters: DiscoverFilters
  activeCount: number
  onApply: (filters: DiscoverFilters) => void
  onReset: () => void
  className?: string
}) {
  return (
    <aside className={className} aria-label="Filters">
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-heading-3 text-foreground">Filters</h2>
          {activeCount > 0 && (
            <span className="text-label text-primary">{activeCount} active</span>
          )}
        </div>

        <DiscoverFilterFields draft={filters} onChange={onApply} />

        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>
    </aside>
  )
}

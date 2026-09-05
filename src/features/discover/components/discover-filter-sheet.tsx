import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { DiscoverFilterFields } from '@/features/discover/components/discover-filters'
import type { DiscoverFilters } from '@/types/discover'

/**
 * PHONE and TABLET filters (<1024px): a bottom sheet with an explicit Apply,
 * because the feed is behind it. Desktop uses `DiscoverFilterPanel` instead —
 * both render the same `DiscoverFilterFields` over the same state.
 */
export function DiscoverFilterSheet({
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
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  function open(next: boolean) {
    // Start each visit from the filters currently in effect.
    if (next) setDraft(filters)
    setIsOpen(next)
  }

  return (
    <Sheet open={isOpen} onOpenChange={open}>
      <SheetTrigger asChild className={className}>
        <Button variant="outline" size="sm" aria-label="Filter sports buddies">
          <SlidersHorizontal className="size-4" />
          Filter
          {activeCount > 0 && (
            <span className="text-label text-primary">{activeCount}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto pb-safe-bottom"
      >
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <SheetDescription>
            Only for this session — your saved discovery preferences stay as
            they are.
          </SheetDescription>
        </SheetHeader>

        <div className="mx-auto w-full max-w-default px-4">
          <DiscoverFilterFields draft={draft} onChange={setDraft} />
        </div>

        <div className="mx-auto flex w-full max-w-default gap-2 px-4 pb-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => {
              onReset()
              setIsOpen(false)
            }}
          >
            Reset
          </Button>
          <Button
            size="lg"
            className="flex-[2]"
            onClick={() => {
              onApply(draft)
              setIsOpen(false)
            }}
          >
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

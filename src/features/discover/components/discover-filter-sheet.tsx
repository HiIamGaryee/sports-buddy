import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { SelectionChip } from '@/components/profile/selection-chip'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { AREAS } from '@/constants/areas'
import { SKILL_LEVELS, SPORTS_INTENTS } from '@/constants/profile-options'
import { SPORTS } from '@/constants/sports'
import type { DiscoverFilters } from '@/types/discover'

const toggle = <T,>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]

export function DiscoverFilterSheet({
  filters,
  activeCount,
  onApply,
  onReset,
}: {
  filters: DiscoverFilters
  activeCount: number
  onApply: (filters: DiscoverFilters) => void
  onReset: () => void
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
      <SheetTrigger asChild>
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

        <div className="flex flex-col gap-6 px-4">
          <FilterGroup label="Sports">
            {SPORTS.map(({ id, name }) => (
              <SelectionChip
                key={id}
                label={name}
                selected={draft.sports.includes(id)}
                onClick={() =>
                  setDraft({ ...draft, sports: toggle(draft.sports, id) })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Skill">
            {SKILL_LEVELS.map(({ id, label }) => (
              <SelectionChip
                key={id}
                label={label}
                selected={draft.skillLevels.includes(id)}
                onClick={() =>
                  setDraft({
                    ...draft,
                    skillLevels: toggle(draft.skillLevels, id),
                  })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Looking for">
            {SPORTS_INTENTS.map(({ id, label }) => (
              <SelectionChip
                key={id}
                label={label}
                selected={draft.intents.includes(id)}
                onClick={() =>
                  setDraft({ ...draft, intents: toggle(draft.intents, id) })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Area">
            {AREAS.map(({ id, name }) => (
              <SelectionChip
                key={id}
                label={name}
                selected={draft.areas.includes(id)}
                onClick={() =>
                  setDraft({ ...draft, areas: toggle(draft.areas, id) })
                }
              />
            ))}
          </FilterGroup>

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <label
                htmlFor="filter-availability"
                className="text-title text-popover-foreground"
              >
                Matching availability
              </label>
              <span className="text-body-small text-muted-foreground">
                Only people free when you are.
              </span>
            </div>
            <Switch
              id="filter-availability"
              checked={draft.requireAvailabilityOverlap}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, requireAvailabilityOverlap: checked })
              }
              className="mt-1 shrink-0"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-2">
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

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-caption text-muted-foreground uppercase">{label}</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </section>
  )
}

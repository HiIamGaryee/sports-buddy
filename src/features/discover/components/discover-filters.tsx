import { ChoiceChip } from '@/components/ui/choice-chip'
import { Switch } from '@/components/ui/switch'
import { AREAS } from '@/constants/areas'
import { SKILL_LEVELS, SPORTS_INTENTS } from '@/constants/profile-options'
import { SPORTS } from '@/constants/sports'
import type { DiscoverFilters } from '@/types/discover'

export const toggleFilterValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]

/**
 * The filter controls themselves, with no presentation of their own — the
 * bottom sheet (phone/tablet) and the persistent desktop panel both render
 * this, so there is ONE filter implementation and one shape of state.
 */
export function DiscoverFilterFields({
  draft,
  onChange,
}: {
  draft: DiscoverFilters
  onChange: (filters: DiscoverFilters) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <FilterGroup label="Sports">
        {SPORTS.map(({ id, name }) => (
          <ChoiceChip
            key={id}
            label={name}
            selected={draft.sports.includes(id)}
            onClick={() =>
              onChange({ ...draft, sports: toggleFilterValue(draft.sports, id) })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Skill">
        {SKILL_LEVELS.map(({ id, label }) => (
          <ChoiceChip
            key={id}
            label={label}
            selected={draft.skillLevels.includes(id)}
            onClick={() =>
              onChange({
                ...draft,
                skillLevels: toggleFilterValue(draft.skillLevels, id),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Looking for">
        {SPORTS_INTENTS.map(({ id, label }) => (
          <ChoiceChip
            key={id}
            label={label}
            selected={draft.intents.includes(id)}
            onClick={() =>
              onChange({
                ...draft,
                intents: toggleFilterValue(draft.intents, id),
              })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Area">
        {AREAS.map(({ id, name }) => (
          <ChoiceChip
            key={id}
            label={name}
            selected={draft.areas.includes(id)}
            onClick={() =>
              onChange({ ...draft, areas: toggleFilterValue(draft.areas, id) })
            }
          />
        ))}
      </FilterGroup>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <label
            htmlFor="filter-availability"
            className="text-title text-foreground"
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
            onChange({ ...draft, requireAvailabilityOverlap: checked })
          }
          className="mt-1 shrink-0"
        />
      </div>
    </div>
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
      {/* Chips wrap into the available width — never a clipped scroller. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </section>
  )
}

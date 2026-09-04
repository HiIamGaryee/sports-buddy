import { MAX_SPORTS, SPORTS } from '@/constants/sports'
import { SelectableCard } from '@/components/profile/selectable-card'
import type { SportId } from '@/types/sports-profile'

/** Shared by onboarding and profile editing. */
export function SportSelector({
  selected,
  onToggle,
  max = MAX_SPORTS,
}: {
  selected: SportId[]
  onToggle: (sportId: SportId) => void
  max?: number
}) {
  const atLimit = selected.length >= max

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-small text-muted-foreground" aria-live="polite">
        {atLimit
          ? `That's the maximum of ${max} sports. Remove one to swap.`
          : `Choose up to ${max} sports · ${selected.length} selected`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {SPORTS.map(({ id, name, icon }) => (
          <SelectableCard
            key={id}
            icon={icon}
            title={name}
            compact
            selected={selected.includes(id)}
            disabled={atLimit && !selected.includes(id)}
            onClick={() => onToggle(id)}
          />
        ))}
      </div>
    </div>
  )
}

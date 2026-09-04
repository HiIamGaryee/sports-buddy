import { SelectableCard } from '@/components/profile/selectable-card'
import { SPORTS_INTENTS } from '@/constants/profile-options'
import type { SportsIntent } from '@/types/sports-profile'

export function IntentSelector({
  selected,
  onToggle,
}: {
  selected: readonly SportsIntent[]
  onToggle: (intent: SportsIntent) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {SPORTS_INTENTS.map(({ id, label, description, icon }) => (
        <SelectableCard
          key={id}
          icon={icon}
          title={label}
          description={description}
          selected={selected.includes(id)}
          onClick={() => onToggle(id)}
        />
      ))}
    </div>
  )
}

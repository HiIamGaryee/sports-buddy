import { SelectableCard } from '@/components/profile/selectable-card'
import { ACTIVITY_INTENSITIES } from '@/constants/profile-options'
import type { ActivityIntensity } from '@/types/sports-profile'

export function IntensitySelector({
  value,
  onChange,
}: {
  value: ActivityIntensity | null
  onChange: (intensity: ActivityIntensity) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {ACTIVITY_INTENSITIES.map(({ id, label, hint, icon }) => (
        <SelectableCard
          key={id}
          icon={icon}
          title={label}
          description={hint}
          selected={value === id}
          onClick={() => onChange(id)}
        />
      ))}
    </div>
  )
}

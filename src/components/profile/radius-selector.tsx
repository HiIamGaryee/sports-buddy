import { SelectionChip } from '@/components/profile/selection-chip'
import { RADIUS_OPTIONS } from '@/constants/profile-options'

export function RadiusSelector({
  value,
  onChange,
  label = 'Preferred travel distance',
}: {
  value: number | null
  onChange: (radiusKm: number) => void
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
      {RADIUS_OPTIONS.map((radius) => (
        <SelectionChip
          key={radius}
          label={`${radius} km`}
          single
          selected={value === radius}
          onClick={() => onChange(radius)}
        />
      ))}
    </div>
  )
}

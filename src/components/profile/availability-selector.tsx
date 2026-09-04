import { DAY_PERIODS, WEEK_DAYS } from '@/constants/profile-options'
import { SelectionChip } from '@/components/profile/selection-chip'
import type { AvailabilitySlot, DayPeriod, WeekDay } from '@/types/sports-profile'

/** Day rows with period chips — compact enough for a 390px viewport. */
export function AvailabilitySelector({
  availability,
  onToggle,
}: {
  availability: AvailabilitySlot[]
  onToggle: (day: WeekDay, period: DayPeriod) => void
}) {
  const isSelected = (day: WeekDay, period: DayPeriod) =>
    availability.some(
      (slot) => slot.day === day && slot.periods.includes(period),
    )

  return (
    <div className="flex flex-col gap-2">
      {WEEK_DAYS.map(({ id: day, label, short }) => (
        <div
          key={day}
          data-day={day}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2"
        >
          <span className="w-10 pl-1 text-label text-card-foreground">
            {short}
          </span>
          <div className="flex flex-1 gap-2">
            {DAY_PERIODS.map((period) => (
              <SelectionChip
                key={period.id}
                label={period.short}
                selected={isSelected(day, period.id)}
                onClick={() => onToggle(day, period.id)}
                className="flex-1 px-0"
              />
            ))}
          </div>
          <span className="sr-only">{label}</span>
        </div>
      ))}
    </div>
  )
}

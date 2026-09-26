import { Check, MoonStar, Sun, Sunrise } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { DAY_PERIODS, WEEK_DAYS } from '@/constants/profile-options'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot, DayPeriod, WeekDay } from '@/types/sports-profile'

const PERIOD_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: MoonStar,
} as const satisfies Record<DayPeriod, LucideIcon>

/** Compact day rows that keep all three periods usable at phone width. */
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
    <div className="flex w-full max-w-2xl flex-col gap-1.5 sm:gap-2">
      {WEEK_DAYS.map(({ id: day, label, short }) => (
        <div
          key={day}
          data-day={day}
          role="group"
          aria-label={`${label} availability`}
          className="grid grid-cols-12 items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 sm:gap-2 sm:p-2"
        >
          <abbr
            title={label}
            className="col-span-3 min-w-0 truncate pl-1 text-caption text-card-foreground no-underline sm:col-span-2 sm:text-label"
          >
            {short}
          </abbr>
          <div className="col-span-9 grid min-w-0 grid-cols-3 gap-1 sm:col-span-10 sm:gap-2">
            {DAY_PERIODS.map((period) => {
              const Icon = PERIOD_ICONS[period.id]
              const selected = isSelected(day, period.id)

              return (
                <button
                  key={period.id}
                  type="button"
                  aria-label={`${label} ${period.label}`}
                  aria-pressed={selected}
                  onClick={() => onToggle(day, period.id)}
                  className={cn(
                    'inline-flex h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1.5 text-caption transition-ui pressable focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:gap-1.5 sm:px-2 sm:text-label',
                    selected
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  {selected && <Check aria-hidden className="size-3.5 shrink-0 sm:size-4" />}
                  <Icon aria-hidden className="size-3.5 shrink-0 sm:size-4" />
                  <span>{period.short}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

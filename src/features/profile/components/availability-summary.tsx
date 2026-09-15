import { formatAvailabilityRows } from '@/lib/profile-format'
import type { AvailabilitySlot } from '@/types/sports-profile'

export function AvailabilitySummary({
  availability,
}: {
  availability: AvailabilitySlot[]
}) {
  const rows = formatAvailabilityRows(availability)

  if (rows.length === 0) {
    return (
      <p className="text-body-small text-muted-foreground">
        No availability set yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map(({ day, periods }) => (
        <div
          key={day}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span className="text-title text-foreground">{day}</span>
          <span className="text-body-small text-muted-foreground">
            {periods}
          </span>
        </div>
      ))}
    </div>
  )
}

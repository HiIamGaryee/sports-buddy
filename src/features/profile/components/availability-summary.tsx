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
    <div className="flex flex-col gap-1.5">
      {rows.map(({ day, periods }) => (
        <div key={day} className="flex items-baseline justify-between gap-3">
          <span className="text-title text-foreground">{day}</span>
          <span className="text-body-small text-muted-foreground">
            {periods}
          </span>
        </div>
      ))}
    </div>
  )
}

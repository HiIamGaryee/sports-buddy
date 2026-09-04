import { AvailabilitySelector } from '@/components/profile/availability-selector'
import type { ProfileDraft } from '@/lib/profile-draft'
import type { DayPeriod, WeekDay } from '@/types/sports-profile'

export function AvailabilityStep({
  draft,
  onTogglePeriod,
}: {
  draft: ProfileDraft
  onTogglePeriod: (day: WeekDay, period: DayPeriod) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-small text-muted-foreground">
        Rough weekly pattern is enough — you can plan the exact time with your
        buddy later.
      </p>
      <AvailabilitySelector
        availability={draft.availability}
        onToggle={onTogglePeriod}
      />
    </div>
  )
}

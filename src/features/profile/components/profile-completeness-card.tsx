import { Card, CardContent } from '@/components/ui/card'
import type { ProfileCompleteness } from '@/lib/profile-completeness'

export function ProfileCompletenessCard({
  completeness,
}: {
  completeness: ProfileCompleteness
}) {
  const { percent, hint } = completeness

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-label text-card-foreground">
            Profile strength
          </span>
          <span className="text-label text-primary">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Profile strength"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        {hint && (
          <p className="text-body-small text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useBuddyRatings } from '@/features/ratings/use-buddy-ratings'
import { cn } from '@/lib/utils'

export function ReliabilityCard({ buddyId }: { buddyId: string }) {
  const { calculateReliability } = useBuddyRatings()
  const stats = calculateReliability(buddyId)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground uppercase">
              Reliability
            </span>
            {stats.label && (
              <span className="text-body-small text-success">{stats.label}</span>
            )}
          </div>
          {stats.totalReviewedActivities > 0 && (
            <span className="text-body-small text-muted-foreground">
              {stats.totalReviewedActivities} activities reviewed
            </span>
          )}
        </div>

        {stats.totalReviewedActivities === 0 ? (
          <p className="text-body-small text-muted-foreground">
            No activity history yet. Complete activities with this Buddy to
            build their reliability history.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Attendance" value={`${stats.attendanceRate}%`} tone="success" />
              <Metric label="On-time" value={`${stats.onTimeRate}%`} tone="primary" />
              <Metric
                label="No-show"
                value={`${stats.noShowRate}%`}
                tone={stats.noShowCount > 0 ? 'warning' : 'success'}
              />
            </div>
            <Separator />
            <ReliabilityBar
              label="Attendance"
              value={stats.attendanceRate ?? 0}
              tone="bg-success"
            />
            <ReliabilityBar
              label="No-show rate"
              value={stats.noShowRate ?? 0}
              tone={stats.noShowCount > 0 ? 'bg-warning' : 'bg-success'}
            />
            <p className="text-body-small text-muted-foreground">
              {stats.noShowCount} no-show{stats.noShowCount === 1 ? '' : 's'} across{' '}
              {stats.totalReviewedActivities} reviewed activit{stats.totalReviewedActivities === 1 ? 'y' : 'ies'}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'success' | 'warning' | 'primary'
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-body-small text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-heading-3',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'primary' && 'text-primary',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ReliabilityBar({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-small text-muted-foreground">{label}</span>
        <span className="text-label text-card-foreground">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

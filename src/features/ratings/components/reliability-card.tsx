import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RECENT_WINDOW_DAYS } from '@/lib/buddy-rating'
import { useBuddyRatings } from '@/features/ratings/use-buddy-ratings'
import { cn } from '@/lib/utils'

/**
 * The track record shown on a profile: how active someone has been lately and
 * how often they actually turn up. ONE component, mounted on both the signed-in
 * user's `/profile` and a candidate's `/discover/:userId`, so what you see about
 * yourself is exactly what other people see about you.
 *
 * Ratings are loaded through the repository-backed ratings hook. Mock mode
 * still uses its fixture repository; Firebase mode reads the bounded
 * `buddyRatings` collection.
 */
export function ReliabilityCard({
  buddyId,
  isSelf = false,
}: {
  buddyId: string
  isSelf?: boolean
}) {
  const { calculateReliability } = useBuddyRatings(buddyId)
  const stats = calculateReliability(buddyId)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground uppercase">
              Track record
            </span>
            {stats.label && (
              <span className="text-body-small text-success">{stats.label}</span>
            )}
          </div>
          {stats.totalReviewedActivities > 0 && (
            <span className="text-body-small text-muted-foreground">
              {stats.totalReviewedActivities} reviewed
            </span>
          )}
        </div>

        {stats.totalReviewedActivities === 0 ? (
          <p className="text-body-small text-muted-foreground">
            {isSelf
              ? 'No activity history yet. Play a few sessions and your buddies can vouch for you here.'
              : 'No activity history yet. Complete activities with this Buddy to build their reliability history.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                label={`Last ${RECENT_WINDOW_DAYS} days`}
                value={`${stats.recentCount}`}
                hint={stats.recentCount === 1 ? 'activity' : 'activities'}
                tone="primary"
              />
              <Metric label="Turned up" value={`${stats.attendanceRate}%`} tone="success" />
              <Metric label="On-time" value={`${stats.onTimeRate}%`} tone="primary" />
              <Metric
                label="No-show"
                value={`${stats.noShowRate}%`}
                tone={stats.noShowCount > 0 ? 'warning' : 'success'}
              />
            </div>
            <Separator />
            <ReliabilityBar
              label="Turned up"
              value={stats.attendanceRate ?? 0}
              tone="bg-success"
            />
            <ReliabilityBar
              label="On-time when they turned up"
              value={stats.onTimeRate ?? 0}
              tone="bg-primary"
            />
            <ReliabilityBar
              label="Signed up but did not go"
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
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone: 'success' | 'warning' | 'primary'
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-body-small text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
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
        {hint && (
          <span className="text-caption text-muted-foreground">{hint}</span>
        )}
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

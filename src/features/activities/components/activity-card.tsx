import { Link } from 'react-router-dom'
import { MapPin, Wallet } from 'lucide-react'

import { ActivityStatusBadge } from '@/features/activities/components/activity-status-badge'
import {
  formatActivityTimeRange,
  formatDateBlock,
} from '@/lib/activity-format'
import { formatBudget, getSportName } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import { activityService } from '@/services/activity/activity-service'
import { activityPath } from '@/routes/routes'
import type { ActivityWithBuddy } from '@/types/activity'

/**
 * The core confirmed-activity unit. Reading order is deliberate: when, what,
 * who, where — with the budget last, because it is planning context rather
 * than a price.
 *
 * The whole card is one link, so it is a single keyboard target.
 */
export function ActivityCard({
  item,
  now,
  surface = 'card',
}: {
  item: ActivityWithBuddy
  /** Injected so the card never reads the clock itself. */
  now: Date
  /**
   * `pastel` puts the card on the shared `.opportunity-card` gradient, so the
   * one activity Home features reads as the same object as an activity post.
   * The activities list keeps `card`, where the plain surface is what
   * separates an upcoming session from a past one.
   */
  surface?: 'card' | 'pastel'
}) {
  const { activity, buddyName } = item
  const { month, day } = formatDateBlock(activity.startAt)
  const state = activityService.getTemporalState(activity, now)
  const happeningNow = activityService.isHappeningNow(activity, now)

  return (
    <Link
      to={activityPath(activity.id)}
      aria-label={`${getSportName(activity.sportId)} with ${buddyName}, ${month} ${day}`}
      className={cn(
        'flex gap-4 transition-ui focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        surface === 'pastel'
          ? // `.opportunity-card`'s own 18rem floor is sized for Discover's
            // much taller result cards; here it would leave half the card
            // empty beside the recommendation it sits next to.
            'opportunity-card min-h-52 p-6'
          : [
              'rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-border-strong hover:shadow-hover',
              // History is calmer, never disabled-looking: a past session is
              // still a readable record you can open, not a dead row.
              state === 'past' && 'bg-surface-subtle shadow-none',
            ],
      )}
    >
      <div
        aria-hidden
        className={cn(
          'flex size-14 shrink-0 flex-col items-center justify-center rounded-xl',
          state === 'past' ? 'bg-card' : 'bg-surface-subtle',
        )}
      >
        <span className="text-caption text-muted-foreground uppercase">
          {month}
        </span>
        <span className="text-heading-3 text-card-foreground">{day}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <span className="line-clamp-2 text-title text-card-foreground">
            {getSportName(activity.sportId)} with {buddyName}
          </span>
          <ActivityStatusBadge state={state} happeningNow={happeningNow} />
        </div>

        <span className="text-body text-foreground">
          {formatActivityTimeRange(activity.startAt, activity.endAt)}
        </span>

        <span className="flex items-center gap-1.5 truncate text-body-small text-muted-foreground">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          {activity.venue.name}
        </span>

        <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Wallet aria-hidden className="size-3.5 shrink-0" />
          {formatBudget(activity.budget)} / person
        </span>
      </div>
    </Link>
  )
}

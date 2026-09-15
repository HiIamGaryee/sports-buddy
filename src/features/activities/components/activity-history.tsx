import { SectionHeader } from '@/components/common/section-header'
import { ActivityCard } from '@/features/activities/components/activity-card'
import { CompletedActivityCard } from '@/features/ratings/components/completed-activity-card'
import { completedActivities } from '@/features/ratings/mock-ratings'
import { groupActivitiesByMonth } from '@/lib/activity'
import type { ActivityWithBuddy } from '@/types/activity'

/**
 * Past sessions, grouped by the month they took place.
 *
 * The grouping itself is `groupActivitiesByMonth` — a pure function — so this
 * component renders groups rather than building them, and the ordering can be
 * tested without a DOM.
 *
 * Deliberately absent: session counts, hours, spend, streaks. History here is
 * a record of what was planned, not an analytics surface, and none of those
 * numbers would mean what they appear to mean while attendance does not
 * exist.
 */
export function ActivityHistory({
  items,
  now,
  reviewerId,
}: {
  items: readonly ActivityWithBuddy[]
  now: Date
  reviewerId: string
}) {
  // Grouped by the underlying activity, then mapped back to the rows that
  // carry buddy details, so the pure helper never learns about profiles.
  const byId = new Map(items.map((item) => [item.activity.id, item]))
  const groups = groupActivitiesByMonth(items.map((item) => item.activity))

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionHeader level="group" as="h3" title="Completed activities" />
        <div className="grid-cards">
          {completedActivities.map((activity) => (
            <CompletedActivityCard
              key={activity.id}
              activity={activity}
              reviewerId={reviewerId}
            />
          ))}
        </div>
      </section>
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <SectionHeader level="group" as="h3" title={group.label} />
          <div className="grid-cards">
            {group.activities.map((activity) => {
              const item = byId.get(activity.id)
              return item ? (
                <ActivityCard key={activity.id} item={item} now={now} />
              ) : null
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

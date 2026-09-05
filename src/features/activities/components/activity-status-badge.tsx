import { Badge } from '@/components/ui/badge'
import type { ActivityStatus } from '@/types/activity'

/**
 * Status in words, never colour alone. Only `upcoming` is reachable in this
 * step — nothing produces the other two yet, so no fake state is shown.
 *
 * Deliberately never says "Booked", "Reserved" or "Paid": Sports Buddy does
 * not reserve anything.
 */
const LABELS = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const satisfies Record<ActivityStatus, string>

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <Badge variant={status === 'upcoming' ? 'default' : 'outline'}>
      {LABELS[status]}
    </Badge>
  )
}

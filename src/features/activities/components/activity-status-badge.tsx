import { CalendarCheck, CircleCheck, CircleSlash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { StatusPill } from '@/components/ui/status-pill'
import type { ActivityStatus } from '@/types/activity'

/**
 * Status in words, never colour alone. Only `upcoming` is reachable in this
 * step — nothing produces the other two yet, so no fake state is shown.
 *
 * Deliberately never says "Booked", "Reserved" or "Paid": Sports Buddy does
 * not reserve anything.
 */
const STATUSES = {
  upcoming: { label: 'Upcoming', tone: 'active', icon: CalendarCheck },
  completed: { label: 'Completed', tone: 'success', icon: CircleCheck },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: CircleSlash },
} as const satisfies Record<
  ActivityStatus,
  { label: string; tone: 'active' | 'success' | 'danger'; icon: LucideIcon }
>

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const { label, tone, icon } = STATUSES[status]

  return (
    <StatusPill tone={tone} icon={icon}>
      {label}
    </StatusPill>
  )
}

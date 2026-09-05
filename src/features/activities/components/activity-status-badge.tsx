import { CalendarCheck, CircleDot, History } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { StatusPill } from '@/components/ui/status-pill'
import type { ActivityTemporalState } from '@/types/activity'

/**
 * WHERE a session sits on the timeline, in words — never colour alone.
 *
 * This reports the DERIVED temporal state, not the stored status. The
 * document only records that the session is `confirmed`; whether it is
 * upcoming or past is the clock's answer, computed at render time.
 *
 * `Past` is deliberately calm rather than an error tone, and deliberately not
 * "Completed": the end time passing says nothing about whether anybody went.
 * Sports Buddy also never says "Booked", "Reserved" or "Paid".
 */
const STATES = {
  upcoming: { label: 'Upcoming', tone: 'active', icon: CalendarCheck },
  past: { label: 'Past', tone: 'neutral', icon: History },
} as const satisfies Record<
  ActivityTemporalState,
  { label: string; tone: 'active' | 'neutral'; icon: LucideIcon }
>

export function ActivityStatusBadge({
  state,
  happeningNow = false,
}: {
  state: ActivityTemporalState
  /** Started but not finished. Still an upcoming session. */
  happeningNow?: boolean
}) {
  if (happeningNow) {
    return (
      <StatusPill tone="success" icon={CircleDot}>
        Happening now
      </StatusPill>
    )
  }

  const { label, tone, icon } = STATES[state]

  return (
    <StatusPill tone={tone} icon={icon}>
      {label}
    </StatusPill>
  )
}

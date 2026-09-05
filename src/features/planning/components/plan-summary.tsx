import { CalendarDays, CircleDashed, MapPin, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { DetailTile } from '@/components/common/detail-tile'
import { StatusPill } from '@/components/ui/status-pill'
import { formatPlannedTime, formatSessionBudget } from '@/lib/plan-format'
import { getSportName } from '@/lib/profile-format'
import { isProposalAgreed, PLAN_STATUS_LABELS } from '@/lib/planning'
import { cn } from '@/lib/utils'
import type { ActivityPlan } from '@/types/planning'

/**
 * The plan as it stands. Reused by the planner's side panel, the review step
 * and the chat card, and shaped so STEP 11 can fill the venue row in without
 * touching anything else.
 *
 * A row only reads as decided once BOTH people have agreed it — a value that
 * one person has suggested still shows as pending.
 */
export function PlanSummary({
  plan,
  buddyName,
  className,
}: {
  plan: ActivityPlan
  buddyName: string
  className?: string
}) {
  const sportAgreed = isProposalAgreed(plan.sportProposal, plan.participants)
  const timeAgreed = isProposalAgreed(plan.timeProposal, plan.participants)
  const budgetAgreed = isProposalAgreed(plan.budgetProposal, plan.participants)
  const venueAgreed = isProposalAgreed(plan.venueProposal, plan.participants)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-caption text-muted-foreground uppercase">
          Plan so far
        </h2>
        <StatusPill
          tone={
            plan.status === 'confirmed' || plan.status === 'venue-agreed'
              ? 'success'
              : plan.status === 'draft'
                ? 'neutral'
                : 'pending'
          }
        >
          {PLAN_STATUS_LABELS[plan.status]}
        </StatusPill>
      </div>

      <div className="flex flex-col gap-2.5">
        <SummaryRow
          icon={CircleDashed}
          label="Sport"
          value={
            plan.sportProposal.value
              ? getSportName(plan.sportProposal.value)
              : null
          }
          agreed={sportAgreed}
        />
        <SummaryRow
          icon={CalendarDays}
          label="When"
          value={
            plan.timeProposal.value
              ? formatPlannedTime(plan.timeProposal.value)
              : null
          }
          agreed={timeAgreed}
        />
        <SummaryRow
          icon={Wallet}
          label="Budget"
          value={
            plan.budgetProposal.value
              ? formatSessionBudget(plan.budgetProposal.value)
              : null
          }
          agreed={budgetAgreed}
        />
        <SummaryRow
          icon={MapPin}
          label="Venue"
          value={plan.venueProposal.value?.name ?? null}
          agreed={venueAgreed}
        />
      </div>

      <p className="text-body-small text-muted-foreground">
        You and {buddyName}
      </p>
    </div>
  )
}

/**
 * One agreed-or-not fact in the summary. The tile itself is shared with the
 * activity detail and the chat card; only the agreement pill is local, since
 * nothing else in the app has a two-person agreement state.
 */
function SummaryRow({
  icon,
  label,
  value,
  agreed,
}: {
  icon: LucideIcon
  label: string
  value: string | null
  agreed: boolean
}) {
  return (
    <DetailTile
      icon={icon}
      label={label}
      value={value}
      muted={!agreed}
      trailing={
        value && (
          <StatusPill tone={agreed ? 'success' : 'pending'}>
            {agreed ? 'Agreed' : 'Pending'}
          </StatusPill>
        )
      }
    />
  )
}

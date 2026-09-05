import { CalendarDays, CircleDashed, MapPin, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatPlannedTime, formatSessionBudget } from '@/lib/plan-format'
import { getSportName } from '@/lib/profile-format'
import { isProposalAgreed } from '@/lib/planning'
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

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-caption text-muted-foreground uppercase">
          Plan so far
        </h2>
        <Badge variant={plan.status === 'ready' ? 'default' : 'outline'}>
          {plan.status === 'ready' ? 'Ready' : 'Draft'}
        </Badge>
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
        {/* Venue is STEP 11. It is shown as genuinely not chosen rather than
            hidden, so the plan reads honestly. */}
        <SummaryRow icon={MapPin} label="Venue" value={null} agreed={false} />
      </div>

      <p className="text-body-small text-muted-foreground">
        You and {buddyName}
      </p>
    </div>
  )
}

function SummaryRow({
  icon: Icon,
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
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0',
          agreed ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            'text-title',
            value ? 'text-card-foreground' : 'text-muted-foreground',
          )}
        >
          {value ?? 'Not decided yet'}
        </span>
      </div>
      {value && (
        <span className="shrink-0 text-caption text-muted-foreground uppercase">
          {agreed ? 'Agreed' : 'Pending'}
        </span>
      )}
    </div>
  )
}

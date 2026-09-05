import { Link } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatPlannedTime, formatSessionBudget } from '@/lib/plan-format'
import { PLAN_STATUS_LABELS } from '@/lib/planning'
import { getSportName } from '@/lib/profile-format'
import { activityPath, planPath } from '@/routes/routes'
import type { ActivityPlan } from '@/types/planning'

/**
 * The plan, pinned above the composer. It is a separate structured surface —
 * plan state is NEVER written into the message history, so a conversation
 * stays a conversation.
 */
export function PlanChatCard({
  plan,
  conversationId,
}: {
  plan: ActivityPlan
  conversationId: string
}) {
  const parts = [
    plan.sportProposal.value ? getSportName(plan.sportProposal.value) : null,
    plan.timeProposal.value ? formatPlannedTime(plan.timeProposal.value) : null,
    plan.budgetProposal.value
      ? formatSessionBudget(plan.budgetProposal.value)
      : null,
    plan.venueProposal.value?.name ?? null,
  ].filter((part): part is string => part !== null)

  const isConfirmed = plan.status === 'confirmed'

  // The action names what actually needs doing next; once an activity
  // exists it becomes the thing worth opening.
  const action = isConfirmed
    ? 'View activity'
    : plan.status === 'venue-agreed'
      ? 'Confirm'
      : plan.status === 'ready'
        ? plan.venueProposal.version > 0
          ? 'Review venue'
          : 'Choose venue'
        : 'Continue'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-subtle px-3 py-2.5">
      <CalendarCheck aria-hidden className="size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-muted-foreground uppercase">
          {isConfirmed
            ? 'Activity confirmed'
            : `Session plan · ${PLAN_STATUS_LABELS[plan.status].toLowerCase()}`}
        </span>
        <span className="truncate text-body-small text-foreground">
          {parts.length > 0 ? parts.join(' · ') : 'Nothing decided yet'}
        </span>
      </div>
      <Button variant="outline" size="sm" asChild className="shrink-0">
        <Link
          to={isConfirmed ? activityPath(plan.id) : planPath(conversationId)}
        >
          {action}
        </Link>
      </Button>
    </div>
  )
}

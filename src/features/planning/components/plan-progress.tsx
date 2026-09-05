import { Check } from 'lucide-react'

import { PLAN_STEPS } from '@/constants/planning'
import { getProposal, isProposalAgreed } from '@/lib/planning'
import { cn } from '@/lib/utils'
import type { ActivityPlan, ProposalKind } from '@/types/planning'

/**
 * Three steps, agreed or not. A tick and a label carry the meaning, so the
 * state never depends on colour — and there is no gamified progress bar.
 */
export function PlanProgress({
  plan,
  activeKind,
  onSelect,
}: {
  plan: ActivityPlan
  activeKind: ProposalKind
  onSelect: (kind: ProposalKind) => void
}) {
  return (
    <ol className="flex gap-2" aria-label="Plan steps">
      {PLAN_STEPS.map(({ kind, label }, index) => {
        const agreed = isProposalAgreed(
          getProposal(plan, kind),
          plan.participants,
        )
        const isActive = kind === activeKind

        return (
          <li key={kind} className="flex-1">
            <button
              type="button"
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onSelect(kind)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-label transition-ui pressable focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                isActive
                  ? 'border-primary bg-primary/12 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
              )}
            >
              {agreed ? (
                <Check aria-hidden className="size-4 shrink-0 text-primary" />
              ) : (
                <span aria-hidden className="text-caption">
                  {index + 1}
                </span>
              )}
              {label}
              <span className="sr-only">
                {agreed ? ' — agreed' : ' — not agreed yet'}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

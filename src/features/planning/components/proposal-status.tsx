import { Check, Clock, UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getProposalState } from '@/lib/planning'
import type { Proposal, ProposalKind } from '@/types/planning'

/**
 * The collaboration state of one proposal, in words. Never colour alone: each
 * state has its own icon and its own sentence, and the Agree button names
 * exactly what is being agreed to.
 */
export function ProposalStatus({
  proposal,
  participants,
  currentUserId,
  buddyName,
  kind,
  summary,
  isSaving,
  onAccept,
}: {
  proposal: Proposal<unknown>
  participants: readonly string[]
  currentUserId: string
  buddyName: string
  kind: ProposalKind
  /** Plain-language value, e.g. "Badminton" — used in the Agree label. */
  summary: string
  isSaving: boolean
  onAccept: (kind: ProposalKind, version: number) => void
}) {
  const state = getProposalState(proposal, participants, currentUserId)
  if (state === 'empty') return null

  if (state === 'agreed') {
    return (
      <p className="flex items-center gap-2 text-body-small text-primary">
        <Check aria-hidden className="size-4 shrink-0" />
        You both agreed on {summary}.
      </p>
    )
  }

  if (state === 'waiting-for-them') {
    return (
      <p className="flex items-center gap-2 text-body-small text-muted-foreground">
        <Clock aria-hidden className="size-4 shrink-0" />
        You suggested {summary}. Waiting for {buddyName}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle p-4">
      <p className="flex items-center gap-2 text-body text-foreground">
        <UserCheck aria-hidden className="size-4 shrink-0 text-primary" />
        {buddyName} suggested {summary}.
      </p>
      <Button
        size="sm"
        disabled={isSaving}
        aria-label={`Agree to ${summary}`}
        onClick={() => onAccept(kind, proposal.version)}
        className="self-start"
      >
        {isSaving ? 'Saving…' : `Agree to ${summary}`}
      </Button>
    </div>
  )
}

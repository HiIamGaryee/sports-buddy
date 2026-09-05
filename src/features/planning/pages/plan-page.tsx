import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PLAN_STEPS } from '@/constants/planning'
import { BudgetStep } from '@/features/planning/components/budget-step'
import { PlanProgress } from '@/features/planning/components/plan-progress'
import { PlanSummary } from '@/features/planning/components/plan-summary'
import { ProposalStatus } from '@/features/planning/components/proposal-status'
import { SportStep } from '@/features/planning/components/sport-step'
import { TimeStep } from '@/features/planning/components/time-step'
import { useActivityPlan } from '@/features/planning/use-activity-plan'
import { formatPlannedTime, formatSessionBudget } from '@/lib/plan-format'
import { getProposal, isProposalAgreed } from '@/lib/planning'
import { getSportName } from '@/lib/profile-format'
import { conversationPath, ROUTES } from '@/routes/routes'
import type { ActivityPlan, ProposalKind } from '@/types/planning'

/** The first step the pair have not agreed yet — where the work actually is. */
const firstOpenStep = (plan: ActivityPlan): ProposalKind =>
  PLAN_STEPS.find(
    ({ kind }) => !isProposalAgreed(getProposal(plan, kind), plan.participants),
  )?.kind ?? 'budget'

export function PlanPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const {
    currentUserId,
    buddyName,
    isAuthorized,
    isResolvingAccess,
    plan,
    isLoading,
    error,
    isSaving,
    actionError,
    sharedSports,
    sharedSlots,
    suggestedSlots,
    suggestedBudget,
    proposeSport,
    proposeTime,
    proposeBudget,
    accept,
  } = useActivityPlan(conversationId)

  // `null` means "follow the plan"; a click pins the step the user chose.
  const [pinnedStep, setPinnedStep] = useState<ProposalKind | null>(null)
  const backToChat = conversationId
    ? conversationPath(conversationId)
    : ROUTES.messages

  if (isResolvingAccess || (isLoading && isAuthorized && !error)) {
    return (
      <>
        <AppHeader title="Plan a session" size="wide" showBack />
        <PageContainer size="wide">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </PageContainer>
      </>
    )
  }

  if (!isAuthorized || (!plan && !isLoading) || error) {
    // Deliberately generic: it must not reveal whether a plan exists.
    return (
      <>
        <AppHeader title="Plan a session" size="default" showBack />
        <PageContainer size="default">
          <div className="flex flex-col items-start gap-4">
            <p role="alert" className="text-title text-foreground">
              {error || 'This plan is unavailable.'}
            </p>
            <p className="text-body-small text-muted-foreground">
              You can plan a session once you are both connected.
            </p>
            <Button variant="outline" asChild>
              <Link to={ROUTES.messages}>Back to Messages</Link>
            </Button>
          </div>
        </PageContainer>
      </>
    )
  }

  if (!plan || !currentUserId) return null

  const activeKind = pinnedStep ?? firstOpenStep(plan)
  const step = PLAN_STEPS.find(({ kind }) => kind === activeKind) ?? PLAN_STEPS[0]
  const isReady = plan.status === 'ready'

  return (
    <>
      <AppHeader
        title="Plan a session"
        subtitle={`Planning with ${buddyName}`}
        size="wide"
        showBack
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to={backToChat}>Back to chat</Link>
          </Button>
        }
      />
      <PageContainer size="wide">
        {/* Planner on the left, live summary beside it from `lg`. Same state,
            same actions — only the arrangement changes. */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-aside-end lg:items-start lg:gap-10">
          <div className="flex flex-col gap-6">
            <PlanProgress
              plan={plan}
              activeKind={activeKind}
              onSelect={setPinnedStep}
            />

            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-heading-2 text-foreground">
                  {step.question}
                </h2>
                <p className="text-body-small text-muted-foreground">
                  Either of you can suggest — it counts once you both agree.
                </p>
              </div>

              <ProposalStatus
                proposal={getProposal(plan, activeKind)}
                participants={plan.participants}
                currentUserId={currentUserId}
                buddyName={buddyName}
                kind={activeKind}
                summary={describe(plan, activeKind)}
                isSaving={isSaving}
                onAccept={accept}
              />

              {actionError && (
                <p role="alert" className="text-body-small text-destructive">
                  {actionError}
                </p>
              )}

              {activeKind === 'sport' && (
                <SportStep
                  options={sharedSports}
                  selectedSportId={plan.sportProposal.value}
                  buddyName={buddyName}
                  isSaving={isSaving}
                  onPropose={(sportId) => void proposeSport(sportId)}
                />
              )}

              {activeKind === 'time' && (
                <TimeStep
                  key={plan.timeProposal.version}
                  sharedSlots={sharedSlots}
                  suggestions={suggestedSlots}
                  proposed={plan.timeProposal.value}
                  isSaving={isSaving}
                  onPropose={(time) => void proposeTime(time)}
                />
              )}

              {activeKind === 'budget' && (
                <BudgetStep
                  key={plan.budgetProposal.version}
                  suggested={suggestedBudget}
                  proposed={plan.budgetProposal.value}
                  buddyName={buddyName}
                  isSaving={isSaving}
                  onPropose={(budget) => void proposeBudget(budget)}
                />
              )}
            </section>

            {isReady && (
              <Card className="border-primary/30">
                <CardContent className="flex flex-col gap-3">
                  <span className="w-fit rounded-full bg-primary-gradient px-3 py-1 text-caption text-primary-foreground uppercase">
                    Plan ready
                  </span>
                  <p className="text-body text-card-foreground">
                    You both agreed on the sport, the time and the budget.
                  </p>
                  <p className="text-body-small text-muted-foreground">
                    Choosing a venue together is the next step — it isn't built
                    yet, so nothing is booked.
                  </p>
                  <Button asChild className="sm:w-auto sm:self-start sm:px-8">
                    <Link to={backToChat}>Back to chat</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="lg:sticky lg:top-6">
            <CardContent>
              <PlanSummary plan={plan} buddyName={buddyName} />
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}

/** Plain-language value for the agreement copy and the Agree button label. */
function describe(plan: ActivityPlan, kind: ProposalKind): string {
  if (kind === 'sport') {
    return plan.sportProposal.value
      ? getSportName(plan.sportProposal.value)
      : 'this sport'
  }
  if (kind === 'time') {
    return plan.timeProposal.value
      ? formatPlannedTime(plan.timeProposal.value)
      : 'this time'
  }
  return plan.budgetProposal.value
    ? formatSessionBudget(plan.budgetProposal.value)
    : 'this budget'
}

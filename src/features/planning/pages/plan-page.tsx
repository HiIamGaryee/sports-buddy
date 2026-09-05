import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarCheck, Check } from 'lucide-react'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CORE_PLAN_STEPS, PLAN_STEPS } from '@/constants/planning'
import { BudgetStep } from '@/features/planning/components/budget-step'
import { PlanProgress } from '@/features/planning/components/plan-progress'
import { PlanSummary } from '@/features/planning/components/plan-summary'
import { ProposalStatus } from '@/features/planning/components/proposal-status'
import { SportStep } from '@/features/planning/components/sport-step'
import { TimeStep } from '@/features/planning/components/time-step'
import { VenueStep } from '@/features/planning/components/venue-step'
import { useActivityPlan } from '@/features/planning/use-activity-plan'
import { useVenueSearch } from '@/features/planning/use-venue-search'
import { formatPlannedTime, formatSessionBudget } from '@/lib/plan-format'
import { getProposal, isPlanReady, isProposalAgreed } from '@/lib/planning'
import { getSportName } from '@/lib/profile-format'
import { activityPath, conversationPath, ROUTES } from '@/routes/routes'
import { VENUE_FALLBACK_MESSAGES } from '@/services/venue/venue-error'
import type { ActivityPlan, ProposalKind } from '@/types/planning'

/**
 * The first step the pair have not agreed yet — where the work actually is.
 * Venue only becomes the target once the other three are settled, because it
 * is what the venue search depends on.
 */
const firstOpenStep = (plan: ActivityPlan): ProposalKind => {
  const openCore = CORE_PLAN_STEPS.find(
    ({ kind }) => !isProposalAgreed(getProposal(plan, kind), plan.participants),
  )
  return openCore?.kind ?? 'venue'
}

export function PlanPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
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
    proposeVenue,
    searchArea,
    accept,
    confirmActivity,
    canConfirm,
    isConfirmed,
  } = useActivityPlan(conversationId)

  // `null` means "follow the plan"; a click pins the step the user chose.
  const [pinnedStep, setPinnedStep] = useState<ProposalKind | null>(null)
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Called unconditionally; it simply does nothing until the plan's sport,
  // time and budget are agreed, which is also the only time a venue search
  // would make sense (and the only time it may cost a Places request).
  const agreedSportId = plan?.sportProposal.value ?? null
  const canSearchVenues = plan !== null && isPlanReady(plan)
  const venueSearch = useVenueSearch(
    canSearchVenues ? agreedSportId : null,
    canSearchVenues ? searchArea : null,
  )
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
  const isReadyToConfirm = canConfirm
  // The venue browser needs the full width, so the summary moves below it.
  const isVenueStep = activeKind === 'venue'

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
        <div
          className={
            isVenueStep
              ? 'flex flex-col gap-8'
              : 'flex flex-col gap-8 lg:grid lg:grid-aside-end lg:items-start lg:gap-10'
          }
        >
          <div className="flex flex-col gap-6">
            {!isConfirmed && (
              <PlanProgress
                plan={plan}
                activeKind={activeKind}
                onSelect={setPinnedStep}
              />
            )}

            {isConfirmed && (
              <Card className="border-primary/30">
                <CardContent className="flex flex-col gap-3">
                  <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary-gradient px-3 py-1 text-caption text-primary-foreground uppercase">
                    <Check aria-hidden className="size-3" />
                    Activity confirmed
                  </span>
                  <p className="text-body text-card-foreground">
                    This plan became a confirmed activity, so it is now a
                    read-only record of what you agreed.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="sm:w-auto sm:px-8">
                      <Link to={activityPath(plan.id)}>View activity</Link>
                    </Button>
                    <Button variant="outline" asChild className="sm:w-auto sm:px-6">
                      <Link to={backToChat}>Back to chat</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Every proposal control disappears once confirmed — a confirmed
                plan is history, not an editable draft. */}
            <section className={isConfirmed ? 'hidden' : 'flex flex-col gap-4'}>
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

              {activeKind === 'venue' && !canSearchVenues && (
                <p className="text-body text-muted-foreground">
                  Agree the sport, time and budget first — the venue search
                  uses the sport you settle on.
                </p>
              )}

              {activeKind === 'venue' && canSearchVenues && !searchArea && (
                <p className="text-body text-muted-foreground">
                  {VENUE_FALLBACK_MESSAGES.noArea}
                </p>
              )}

              {activeKind === 'venue' &&
                canSearchVenues &&
                searchArea &&
                agreedSportId && (
                  <VenueStep
                    sportId={agreedSportId}
                    area={searchArea}
                    venues={venueSearch.venues}
                    query={venueSearch.query}
                    isLoading={venueSearch.isLoading}
                    error={venueSearch.error}
                    isConfigurationError={venueSearch.isConfigurationError}
                    selectedVenueId={selectedVenueId}
                    proposingVenueId={isSaving ? selectedVenueId : null}
                    onQueryChange={venueSearch.setQuery}
                    onSelect={setSelectedVenueId}
                    onPropose={(venue) => {
                      setSelectedVenueId(venue.id)
                      void proposeVenue(venue)
                    }}
                    onRetry={venueSearch.retry}
                  />
                )}
            </section>

            {/* The final review. Both people already agreed every part
                during planning, so one press finishes it — there is no
                second round of mutual confirmation. */}
            {isReadyToConfirm && (
              <Card className="border-primary/30">
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-caption text-muted-foreground uppercase">
                      Final review
                    </span>
                    <h2 className="text-heading-3 text-card-foreground">
                      Everything is agreed.
                    </h2>
                  </div>

                  <PlanSummary plan={plan} buddyName={buddyName} />

                  <p className="text-body-small text-muted-foreground">
                    Confirming saves this as an activity you can both see.
                    Sports Buddy doesn't reserve the venue.
                  </p>

                  <Button
                    size="lg"
                    disabled={isConfirming || isSaving}
                    aria-label="Confirm this activity"
                    onClick={() => {
                      setIsConfirming(true)
                      void confirmActivity().then((activity) => {
                        setIsConfirming(false)
                        // Only navigate on a confirmed write — never
                        // optimistically to an activity that may not exist.
                        if (activity) navigate(activityPath(activity.id))
                      })
                    }}
                    className="sm:w-auto sm:self-start sm:px-10"
                  >
                    <CalendarCheck className="size-4" />
                    {isConfirming ? 'Confirming…' : 'Confirm activity'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {!isReadyToConfirm && (
            <Card className={isVenueStep ? undefined : 'lg:sticky lg:top-6'}>
              <CardContent>
                <PlanSummary plan={plan} buddyName={buddyName} />
              </CardContent>
            </Card>
          )}
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
  if (kind === 'budget') {
    return plan.budgetProposal.value
      ? formatSessionBudget(plan.budgetProposal.value)
      : 'this budget'
  }
  return plan.venueProposal.value?.name ?? 'this venue'
}

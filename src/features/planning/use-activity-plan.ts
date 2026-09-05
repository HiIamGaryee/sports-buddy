import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { useProfile } from '@/hooks/use-profile'
import { getOtherParticipantId } from '@/lib/connection'
import {
  canPlanTogether,
  getSharedAvailabilitySlots,
  getSharedSportOptions,
  getSuggestedBudget,
  getUpcomingDatesForAvailability,
  isPlanReady,
} from '@/lib/planning'
import { activityPlanService } from '@/services/planning/activity-plan-service'
import { discoverService } from '@/services/discover/discover-service'
import { venueService } from '@/services/venue/venue-service'
import type { ActivityPlan, PlannedTime, ProposalKind } from '@/types/planning'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { BudgetPreference, SportId } from '@/types/sports-profile'
import type { Venue } from '@/types/venue'

interface PlanState {
  key: string
  plan: ActivityPlan | null
  isLoading: boolean
  error: string
}

const loadingState = (key: string): PlanState => ({
  key,
  plan: null,
  isLoading: true,
  error: '',
})

/**
 * One shared plan. Authorization is resolved from the connection state the
 * provider already holds, before anything is requested — so an unauthorized
 * route never flashes somebody else's plan.
 *
 * Suggestions (shared sports, shared slots, suggested budget) are derived
 * from the two PROFILES; the plan stores what the two people actually agreed.
 * Changing a profile later never rewrites an existing plan.
 */
export function useActivityPlan(conversationId: string | undefined) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { connections, isLoading: isLoadingConnections } = useConnections()
  const userId = user?.id ?? null

  // The plan, the conversation and the connection all share one id.
  const connection = useMemo(
    () =>
      conversationId
        ? ([...connections.values()].find(
            (entry) => entry.id === conversationId,
          ) ?? null)
        : null,
    [connections, conversationId],
  )

  const isAuthorized = userId !== null && canPlanTogether(connection, userId)
  const buddyId = useMemo(
    () =>
      connection && userId ? getOtherParticipantId(connection, userId) : null,
    [connection, userId],
  )

  const requestKey = `${conversationId ?? ''}#${userId ?? ''}`
  const [state, setState] = useState<PlanState>(() => loadingState(requestKey))
  const plan = state.plan
  // Reset during render when the route or user changes — no effect needed.
  if (state.key !== requestKey) setState(loadingState(requestKey))

  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!conversationId || !userId || !isAuthorized) return

    let active = true
    let unsubscribe: (() => void) | undefined

    // Resume the active plan, or create it — then watch it.
    activityPlanService
      .openPlan(connection, userId)
      .then(() => {
        if (!active) return
        unsubscribe = activityPlanService.subscribe(
          conversationId,
          (plan) => {
            if (active) {
              setState({ key: requestKey, plan, isLoading: false, error: '' })
            }
          },
          (subscriptionError) => {
            if (!active) return
            setState((current) => ({
              ...current,
              isLoading: false,
              error: subscriptionError.message,
            }))
          },
        )
      })
      .catch((openError: unknown) => {
        if (!active) return
        setState((current) => ({
          ...current,
          isLoading: false,
          error:
            openError instanceof Error
              ? openError.message
              : "We couldn't load this plan.",
        }))
      })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [conversationId, userId, isAuthorized, connection, requestKey])

  // One discovery-safe read for the buddy's name and their planning inputs.
  const [buddy, setBuddy] = useState<DiscoveryProfile | null>(null)

  useEffect(() => {
    if (!buddyId) return

    let active = true
    discoverService
      .getCandidate(buddyId)
      .then((candidate) => {
        if (active && candidate) setBuddy(candidate)
      })
      .catch(() => {
        // Without a projection the planner falls back to generic copy.
      })

    return () => {
      active = false
    }
  }, [buddyId])

  const sharedSports = useMemo(
    () =>
      profile && buddy ? getSharedSportOptions(profile.sports, buddy.sports) : [],
    [profile, buddy],
  )

  const sharedSlots = useMemo(
    () =>
      profile && buddy
        ? getSharedAvailabilitySlots(profile.availability, buddy.availability)
        : [],
    [profile, buddy],
  )

  const suggestedSlots = useMemo(
    // `new Date()` is read once per recomputation, not per render tick.
    () => getUpcomingDatesForAvailability(sharedSlots, new Date()),
    [sharedSlots],
  )

  // Derived from the two PROFILE areas, so venue search never needs (or
  // asks for) a device position.
  const searchArea = useMemo(
    () =>
      profile && buddy
        ? venueService.getSearchArea(profile.area, buddy.area)
        : null,
    [profile, buddy],
  )

  const suggestedBudget = useMemo(
    () => (profile && buddy ? getSuggestedBudget(profile.budget, buddy.budget) : null),
    [profile, buddy],
  )

  /** Every mutation goes through here, so busy/error handling exists once. */
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      if (isSaving) return false
      setIsSaving(true)
      setActionError('')
      try {
        await action()
        return true
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "We couldn't update the plan. Please try again.",
        )
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [isSaving],
  )

  const proposeSport = useCallback(
    (sportId: SportId) =>
      run(() =>
        activityPlanService.proposeSport(
          connection,
          userId ?? '',
          sportId,
          sharedSports.map((option) => option.sportId),
        ),
      ),
    [run, connection, userId, sharedSports],
  )

  const proposeTime = useCallback(
    (time: Omit<PlannedTime, 'timeZone'>) =>
      run(() =>
        activityPlanService.proposeTime(connection, userId ?? '', time),
      ),
    [run, connection, userId],
  )

  const proposeVenue = useCallback(
    (venue: Venue) =>
      run(() =>
        activityPlanService.proposeVenue(
          connection,
          userId ?? '',
          venueService.toSelection(venue),
          plan !== null && isPlanReady(plan),
        ),
      ),
    [run, connection, userId, plan],
  )

  const proposeBudget = useCallback(
    (budget: BudgetPreference) =>
      run(() =>
        activityPlanService.proposeBudget(connection, userId ?? '', budget),
      ),
    [run, connection, userId],
  )

  const accept = useCallback(
    (kind: ProposalKind, version: number) =>
      run(() =>
        activityPlanService.accept(connection, userId ?? '', kind, version),
      ),
    [run, connection, userId],
  )

  return {
    currentUserId: userId,
    buddyName: buddy?.displayName ?? 'your sports buddy',
    buddyPhotoUrl: buddy?.photoUrl ?? null,
    /** False for a missing, pending or someone else's plan alike. */
    isAuthorized,
    isResolvingAccess: isLoadingConnections,
    plan,
    isLoading: state.isLoading,
    error: state.error,
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
    /** The two AREA centroids' midpoint — never anybody's location. */
    searchArea,
    accept,
  }
}

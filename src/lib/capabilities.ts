import {
  FREE_MAX_HOSTED_GROUP_ACTIVITIES,
  FREE_MAX_JOINED_GROUP_ACTIVITIES,
} from '@/constants/entitlements'
import type { SubscriptionState } from '@/types/subscription'

/**
 * Pure free/Buddy+ capability rules — no Firebase, no storage, no React, no
 * RevenueCat type. Every gate in the UI calls one of these instead of
 * re-deriving `state === 'buddy_plus'` inline, so the rule lives in one place.
 *
 * `'unknown'` and `'loading'` are treated as NOT entitled (fail closed): a
 * feature must not flash on before the real state is known. `'error'` is
 * also not entitled — a RevenueCat outage must not silently grant Buddy+.
 */
const isEntitled = (state: SubscriptionState) => state === 'buddy_plus'

export function isBuddyPlus(state: SubscriptionState): boolean {
  return isEntitled(state)
}

/** `currentCount` is how many the member is joined to or hosting RIGHT NOW. */
export function canJoinAnotherGroupActivity(
  state: SubscriptionState,
  currentJoinedCount: number,
): boolean {
  return isEntitled(state) || currentJoinedCount < FREE_MAX_JOINED_GROUP_ACTIVITIES
}

export function canHostAnotherGroupActivity(
  state: SubscriptionState,
  currentHostedCount: number,
): boolean {
  return isEntitled(state) || currentHostedCount < FREE_MAX_HOSTED_GROUP_ACTIVITIES
}

export function canUseAdvancedDiscoverFilters(state: SubscriptionState): boolean {
  return isEntitled(state)
}

/** Filtering candidates by their verified reliability (STEP 15 Reliability Profile). */
export function canUseReliabilityFilter(state: SubscriptionState): boolean {
  return isEntitled(state)
}

/** Trend breakdowns beyond the free monthly recap's plain counts. */
export function canUseAdvancedAnalytics(state: SubscriptionState): boolean {
  return isEntitled(state)
}

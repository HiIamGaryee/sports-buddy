import { describe, expect, it } from 'vitest'

import {
  canHostAnotherGroupActivity,
  canJoinAnotherGroupActivity,
  canUseAdvancedAnalytics,
  canUseAdvancedDiscoverFilters,
  canUseReliabilityFilter,
  getMaxProfileSports,
  isBuddyPlus,
} from '@/lib/capabilities'
import {
  FREE_MAX_HOSTED_GROUP_ACTIVITIES,
  FREE_MAX_JOINED_GROUP_ACTIVITIES,
} from '@/constants/entitlements'
import { MAX_BUDDY_PLUS_SPORTS, MAX_SPORTS } from '@/constants/sports'

describe('isBuddyPlus', () => {
  it('is true only for the resolved buddy_plus state', () => {
    expect(isBuddyPlus('buddy_plus')).toBe(true)
    expect(isBuddyPlus('free')).toBe(false)
  })

  it('fails closed on every unresolved or failed state', () => {
    expect(isBuddyPlus('unknown')).toBe(false)
    expect(isBuddyPlus('loading')).toBe(false)
    expect(isBuddyPlus('error')).toBe(false)
  })
})

describe('free plan group-activity limits', () => {
  it('allows joining up to the free cap, not one more', () => {
    expect(canJoinAnotherGroupActivity('free', FREE_MAX_JOINED_GROUP_ACTIVITIES - 1)).toBe(true)
    expect(canJoinAnotherGroupActivity('free', FREE_MAX_JOINED_GROUP_ACTIVITIES)).toBe(false)
  })

  it('allows hosting up to the free cap, not one more', () => {
    expect(canHostAnotherGroupActivity('free', FREE_MAX_HOSTED_GROUP_ACTIVITIES - 1)).toBe(true)
    expect(canHostAnotherGroupActivity('free', FREE_MAX_HOSTED_GROUP_ACTIVITIES)).toBe(false)
  })

  it('removes both caps for buddy_plus, whatever the count', () => {
    expect(canJoinAnotherGroupActivity('buddy_plus', 999)).toBe(true)
    expect(canHostAnotherGroupActivity('buddy_plus', 999)).toBe(true)
  })

  it('fails closed (treats as free) while the entitlement is still resolving', () => {
    expect(canJoinAnotherGroupActivity('loading', 0)).toBe(true)
    expect(canJoinAnotherGroupActivity('loading', FREE_MAX_JOINED_GROUP_ACTIVITIES)).toBe(false)
  })
})

describe('feature gates', () => {
  it('are all off for free and on for buddy_plus', () => {
    for (const gate of [canUseAdvancedDiscoverFilters, canUseReliabilityFilter, canUseAdvancedAnalytics]) {
      expect(gate('free')).toBe(false)
      expect(gate('buddy_plus')).toBe(true)
    }
  })
})

describe('profile sports limit', () => {
  it('uses the free limit until Buddy+ is resolved', () => {
    expect(getMaxProfileSports('free')).toBe(MAX_SPORTS)
    expect(getMaxProfileSports('loading')).toBe(MAX_SPORTS)
    expect(getMaxProfileSports('error')).toBe(MAX_SPORTS)
  })

  it('uses the configured Buddy+ limit when entitled', () => {
    expect(getMaxProfileSports('buddy_plus')).toBe(MAX_BUDDY_PLUS_SPORTS)
  })
})

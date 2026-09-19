/**
 * The one paid tier and its free-plan limits. Centralized so nothing
 * hardcodes a number inline — mirrors how `src/constants/activity-posts.ts`
 * and friends work. See `docs/monetization.md`.
 */

/** Must match the entitlement identifier configured in the RevenueCat dashboard. */
export const BUDDY_PLUS_ENTITLEMENT_ID = 'sportbuddy_pro'

/** Public demo codes for the browser/mock subscription flow only. */
export const MOCK_REDEEM_CODES = [
  'BUDDY-7K4M-2Q9P',
  'BUDDY-3F8N-6R2T',
  'BUDDY-9H5Q-4W7K',
  'BUDDY-2M6X-8C3V',
  'BUDDY-5P9L-1D7S',
  'BUDDY-4T2B-6Y8J',
  'BUDDY-8G3R-5K1N',
  'BUDDY-6V7C-2H9M',
  'BUDDY-1Q4W-8F6P',
  'BUDDY-9Z2D-3L5X',
] as const

export const MOCK_REDEEM_CODE_PATTERN = /^BUDDY-[A-Z0-9]{4}-[A-Z0-9]{4}$/

export const normalizeMockRedeemCode = (code: string) =>
  code.trim().toUpperCase().replace(/\s+/g, '')

export const isMockRedeemCodeFormat = (code: string) =>
  MOCK_REDEEM_CODE_PATTERN.test(normalizeMockRedeemCode(code))

/**
 * How many group activities a FREE member may be joined to or hosting AT
 * ONCE — not per week/month. Finishing or leaving one frees a slot. Buddy+
 * removes both caps.
 */
export const FREE_MAX_JOINED_GROUP_ACTIVITIES = 3
export const FREE_MAX_HOSTED_GROUP_ACTIVITIES = 2

/**
 * The one paid tier and its free-plan limits. Centralized so nothing
 * hardcodes a number inline — mirrors how `src/constants/activity-posts.ts`
 * and friends work. See `docs/monetization.md`.
 */

/** Must match the entitlement identifier configured in the RevenueCat dashboard. */
export const BUDDY_PLUS_ENTITLEMENT_ID = 'sportbuddy_pro'

/**
 * How many group activities a FREE member may be joined to or hosting AT
 * ONCE — not per week/month. Finishing or leaving one frees a slot. Buddy+
 * removes both caps.
 */
export const FREE_MAX_JOINED_GROUP_ACTIVITIES = 3
export const FREE_MAX_HOSTED_GROUP_ACTIVITIES = 2

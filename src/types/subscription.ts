/**
 * Buddy+ subscription state. RevenueCat is the source of truth — nothing
 * here is ever written to Firestore as a `premium: true` field, and no
 * RevenueCat SDK type leaves the repository layer (same rule as Firebase).
 */

/** The one entitlement this app sells. One premium tier — see `docs/monetization.md`. */
export type EntitlementId = 'buddy_plus'

/**
 * `unknown` before the first check ever resolves (never treated as free);
 * `loading` while a check is in flight; `free` / `buddy_plus` once resolved;
 * `error` when RevenueCat could not be reached — the UI treats this like
 * `free` for gating (fail closed on limits) but shows a retry.
 */
export type SubscriptionState = 'unknown' | 'loading' | 'free' | 'buddy_plus' | 'error'

/** One purchasable option inside an offering — RevenueCat's own display price string. */
export interface SubscriptionPackage {
  /** The RevenueCat package identifier (`$rc_monthly`, `$rc_annual`, or custom). */
  id: string
  /** Store product id, for logging/debugging only — never shown to the user. */
  productId: string
  title: string
  description: string
  /** Localized, store-formatted price (e.g. "RM 12.90"). Never hardcode a price. */
  priceString: string
  /** Localized billing period phrase from the store, when the store provides one. */
  periodLabel: string | null
}

/** The current offering's packages, as fetched from RevenueCat. */
export interface SubscriptionOffering {
  id: string
  packages: SubscriptionPackage[]
}

export type PurchaseOutcome = 'purchased' | 'cancelled'

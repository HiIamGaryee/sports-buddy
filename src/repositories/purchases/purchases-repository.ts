import type { SubscriptionOffering } from '@/types/subscription'

/** What RevenueCat says right now: which entitlement ids are active. */
export interface EntitlementSnapshot {
  activeEntitlementIds: string[]
}

export interface PurchaseResult extends EntitlementSnapshot {
  /** `false` when the member closed the purchase sheet — not an error. */
  completed: boolean
}

/**
 * What happened when the RevenueCat-hosted Paywall UI was shown, mapped from
 * `PAYWALL_RESULT` so that enum never leaves this layer either.
 * `not-presented` is not a failure — it means either the platform has no
 * native Paywall (the web stand-in) or nobody has designed one in the
 * RevenueCat dashboard yet; the caller falls back to its own package list.
 */
export type PaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'not-presented' | 'error'

export interface PaywallPresentation extends EntitlementSnapshot {
  outcome: PaywallOutcome
}

/**
 * The one place `@revenuecat/purchases-capacitor` types may be imported.
 * Everything above this layer sees only `SubscriptionOffering` /
 * `EntitlementSnapshot` — no RevenueCat SDK type, matching how Firebase types
 * never leave `src/repositories/**`.
 *
 * `purchasePackage` takes the package id from the offering this repository
 * itself returned; the raw store package object never leaves the
 * implementation (the same "cursor never leaves the repository" rule used
 * for Firestore pagination).
 */
export interface PurchasesRepository {
  /** Idempotent. Ties RevenueCat's App User ID to the Sports Buddy uid. */
  configure(appUserId: string): Promise<void>
  /** `null` when RevenueCat has no current offering configured yet. */
  getOffering(): Promise<SubscriptionOffering | null>
  getEntitlements(): Promise<EntitlementSnapshot>
  purchasePackage(packageId: string): Promise<PurchaseResult>
  /** Mock/browser-only subscription code redemption. */
  redeemCode(code: string): Promise<PurchaseResult>
  restorePurchases(): Promise<EntitlementSnapshot>
  /**
   * The RevenueCat-hosted Paywall UI (designed in the dashboard, not this
   * codebase), shown only if the member does not already have
   * `entitlementId`. `not-presented` on the web stand-in and whenever no
   * Paywall exists yet for the current offering — the caller falls back to
   * its own package list, never treats it as an error.
   */
  presentPaywallIfNeeded(entitlementId: string): Promise<PaywallPresentation>
  /** The RevenueCat-hosted Customer Center (cancel, manage, see receipts). */
  presentCustomerCenter(): Promise<void>
  /** One scoped listener, mirroring the connections/conversations pattern. */
  subscribeToEntitlements(
    onChange: (snapshot: EntitlementSnapshot) => void,
    onError: (error: Error) => void,
  ): () => void
  /** Called on sign-out, so the next sign-in never sees a stale identity. */
  reset(): Promise<void>
}

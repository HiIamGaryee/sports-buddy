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
  restorePurchases(): Promise<EntitlementSnapshot>
  /** One scoped listener, mirroring the connections/conversations pattern. */
  subscribeToEntitlements(
    onChange: (snapshot: EntitlementSnapshot) => void,
    onError: (error: Error) => void,
  ): () => void
  /** Called on sign-out, so the next sign-in never sees a stale identity. */
  reset(): Promise<void>
}

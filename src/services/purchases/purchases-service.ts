import { BUDDY_PLUS_ENTITLEMENT_ID } from '@/constants/entitlements'
import { isValidDocumentId } from '@/lib/ids'
import { purchasesRepository } from '@/repositories/repositories'
import type {
  EntitlementSnapshot,
  PaywallOutcome,
} from '@/repositories/purchases/purchases-repository'
import {
  PURCHASES_FALLBACK_MESSAGES,
  toPurchasesError,
} from '@/services/purchases/purchases-error'
import type {
  PurchaseOutcome,
  SubscriptionOffering,
  SubscriptionState,
} from '@/types/subscription'

const stateFromSnapshot = (snapshot: EntitlementSnapshot): SubscriptionState =>
  snapshot.activeEntitlementIds.includes(BUDDY_PLUS_ENTITLEMENT_ID) ? 'buddy_plus' : 'free'

/**
 * Buddy+ entitlement, one layer above the repository: validates the Sports
 * Buddy uid before it becomes a RevenueCat App User ID, and maps every
 * failure to a user-safe `PurchasesError`. No React state, no platform check
 * — that's `repositories.ts`'s job, same split as every other service.
 */
export const purchasesService = {
  /** Ties RevenueCat to the SIGNED-IN Sports Buddy account. Idempotent. */
  async configure(uid: string): Promise<void> {
    if (!isValidDocumentId(uid)) return
    try {
      await purchasesRepository.configure(uid)
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.load)
    }
  },

  async getOffering(): Promise<SubscriptionOffering | null> {
    try {
      return await purchasesRepository.getOffering()
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.load)
    }
  },

  async getState(): Promise<SubscriptionState> {
    try {
      return stateFromSnapshot(await purchasesRepository.getEntitlements())
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.load)
    }
  },

  async purchase(packageId: string): Promise<{ outcome: PurchaseOutcome; state: SubscriptionState }> {
    try {
      const result = await purchasesRepository.purchasePackage(packageId)
      return {
        outcome: result.completed ? 'purchased' : 'cancelled',
        state: stateFromSnapshot(result),
      }
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.purchase)
    }
  },

  async redeemCode(code: string): Promise<{ outcome: PurchaseOutcome; state: SubscriptionState }> {
    try {
      const result = await purchasesRepository.redeemCode(code)
      return {
        outcome: result.completed ? 'purchased' : 'cancelled',
        state: stateFromSnapshot(result),
      }
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.redeem)
    }
  },

  async restore(): Promise<SubscriptionState> {
    try {
      return stateFromSnapshot(await purchasesRepository.restorePurchases())
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.restore)
    }
  },

  /**
   * The RevenueCat-hosted Paywall UI. `outcome: 'not-presented'` is not a
   * failure — the caller (the paywall page) falls back to its own package
   * list, which is exactly right on the web stand-in and whenever nobody has
   * designed a Paywall in the dashboard yet.
   */
  async presentPaywallIfNeeded(): Promise<{ outcome: PaywallOutcome; state: SubscriptionState }> {
    try {
      const result = await purchasesRepository.presentPaywallIfNeeded(BUDDY_PLUS_ENTITLEMENT_ID)
      return { outcome: result.outcome, state: stateFromSnapshot(result) }
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.purchase)
    }
  },

  /** The RevenueCat-hosted Customer Center — manage/cancel, native only. */
  async presentCustomerCenter(): Promise<void> {
    try {
      await purchasesRepository.presentCustomerCenter()
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.load)
    }
  },

  /** One scoped listener; the provider owns its lifetime. */
  subscribe(
    onChange: (state: SubscriptionState) => void,
    onError: (error: Error) => void,
  ): () => void {
    return purchasesRepository.subscribeToEntitlements(
      (snapshot) => onChange(stateFromSnapshot(snapshot)),
      (error) => onError(toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.load)),
    )
  },

  async reset(): Promise<void> {
    await purchasesRepository.reset().catch(() => {
      // Sign-out must never fail because RevenueCat could not log out.
    })
  },
}

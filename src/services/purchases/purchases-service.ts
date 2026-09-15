import { BUDDY_PLUS_ENTITLEMENT_ID } from '@/constants/entitlements'
import { isValidDocumentId } from '@/lib/ids'
import { purchasesRepository } from '@/repositories/repositories'
import type { EntitlementSnapshot } from '@/repositories/purchases/purchases-repository'
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

  async restore(): Promise<SubscriptionState> {
    try {
      return stateFromSnapshot(await purchasesRepository.restorePurchases())
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.restore)
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

import { MOCK_PREMIUM_ACCOUNT_ID } from '@/constants/app'
import { BUDDY_PLUS_ENTITLEMENT_ID } from '@/constants/entitlements'
import type { PurchasesRepository } from '@/repositories/purchases/purchases-repository'
import {
  PURCHASES_ERROR_CODES,
  purchasesRepositoryError,
} from '@/services/purchases/purchases-error'

let configuredFor: string | null = null

const buddyPlusSnapshot = () => ({
  activeEntitlementIds: [BUDDY_PLUS_ENTITLEMENT_ID],
})

/**
 * The browser / mock-mode stand-in. There is no store transaction here, but
 * the seeded demo account unlocks Buddy+ for UI review (promo codes are
 * handled separately, by `promoCodeService`). Real package purchases still throw a coded error instead of
 * pretending to charge someone. `getOffering()` returns `null` rather than
 * inventing prices.
 */
export const webPurchasesRepository: PurchasesRepository = {
  async configure(appUserId) {
    // Nothing to configure — there is no store to talk to in a browser.
    configuredFor = appUserId
  },
  async getOffering() {
    return null
  },
  async getEntitlements() {
    // Promo codes are a separate, backend-checked grant (promo-code-service).
    return configuredFor === MOCK_PREMIUM_ACCOUNT_ID
      ? buddyPlusSnapshot()
      : { activeEntitlementIds: [] }
  },
  async purchasePackage() {
    throw purchasesRepositoryError(PURCHASES_ERROR_CODES.webOnly)
  },
  async restorePurchases() {
    throw purchasesRepositoryError(PURCHASES_ERROR_CODES.webOnly)
  },
  async presentPaywallIfNeeded() {
    // Not an error: there is no native Paywall UI on the web, so the caller
    // falls back to its own package list (which itself explains that
    // purchasing needs the Android app).
    return { activeEntitlementIds: [], outcome: 'not-presented' }
  },
  async presentCustomerCenter() {
    throw purchasesRepositoryError(PURCHASES_ERROR_CODES.webOnly)
  },
  subscribeToEntitlements() {
    // Never changes on the web, so there is nothing to notify.
    return () => {}
  },
  async reset() {
    configuredFor = null
  },
}

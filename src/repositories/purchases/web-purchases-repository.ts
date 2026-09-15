import type { PurchasesRepository } from '@/repositories/purchases/purchases-repository'
import { PURCHASES_ERROR_CODES, purchasesRepositoryError } from '@/services/purchases/purchases-error'

/**
 * The browser / mock-mode stand-in. The paywall still renders here (so the
 * page is reviewable on the web demo), but no purchase is ever faked — every
 * mutating call throws the same honest, coded error instead of pretending to
 * buy something (mapped to a user-safe sentence by `toPurchasesError`).
 * `getOffering()` returns `null` rather than inventing prices, so the
 * paywall shows "Open the Android app" instead of a broken package list.
 */
export const webPurchasesRepository: PurchasesRepository = {
  async configure() {
    // Nothing to configure — there is no store to talk to in a browser.
  },
  async getOffering() {
    return null
  },
  async getEntitlements() {
    return { activeEntitlementIds: [] }
  },
  async purchasePackage() {
    throw purchasesRepositoryError(PURCHASES_ERROR_CODES.webOnly)
  },
  async restorePurchases() {
    throw purchasesRepositoryError(PURCHASES_ERROR_CODES.webOnly)
  },
  subscribeToEntitlements() {
    // Never changes on the web, so there is nothing to notify.
    return () => {}
  },
  async reset() {
    // Nothing was configured.
  },
}

import { MOCK_PREMIUM_ACCOUNT_ID, MOCK_STORAGE_KEYS } from '@/constants/app'
import {
  BUDDY_PLUS_ENTITLEMENT_ID,
  MOCK_REDEEM_CODES,
  isMockRedeemCodeFormat,
  normalizeMockRedeemCode,
} from '@/constants/entitlements'
import { readStore, writeStore } from '@/repositories/mock-store'
import type { PurchasesRepository } from '@/repositories/purchases/purchases-repository'
import {
  PURCHASES_ERROR_CODES,
  purchasesRepositoryError,
} from '@/services/purchases/purchases-error'

type RedeemedCodeStore = Record<string, string>

const isRedeemedCodeStore = (value: unknown): value is RedeemedCodeStore =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.entries(value).every(
        ([code, userId]) => typeof code === 'string' && typeof userId === 'string',
      ),
  )

const readRedeemedCodes = () =>
  readStore<RedeemedCodeStore>(MOCK_STORAGE_KEYS.redeemedCodes, {}, isRedeemedCodeStore)

let configuredFor: string | null = null

const buddyPlusSnapshot = () => ({
  activeEntitlementIds: [BUDDY_PLUS_ENTITLEMENT_ID],
})

/**
 * The browser / mock-mode stand-in. There is no store transaction here, but
 * the seeded demo account and one-time local redeem codes can unlock Buddy+
 * for UI review. Real package purchases still throw a coded error instead of
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
    const isDemoAccount = configuredFor === MOCK_PREMIUM_ACCOUNT_ID
    const hasRedeemedCode = configuredFor
      ? Object.values(readRedeemedCodes()).includes(configuredFor)
      : false
    return isDemoAccount || hasRedeemedCode ? buddyPlusSnapshot() : { activeEntitlementIds: [] }
  },
  async purchasePackage() {
    throw purchasesRepositoryError(PURCHASES_ERROR_CODES.webOnly)
  },
  async redeemCode(code) {
    const normalized = normalizeMockRedeemCode(code)
    const isKnownCode = (MOCK_REDEEM_CODES as readonly string[]).includes(normalized)
    if (!configuredFor || !isMockRedeemCodeFormat(normalized) || !isKnownCode) {
      throw purchasesRepositoryError(PURCHASES_ERROR_CODES.invalidRedeemCode)
    }

    const redeemedCodes = readRedeemedCodes()
    if (redeemedCodes[normalized]) {
      throw purchasesRepositoryError(PURCHASES_ERROR_CODES.redeemedCode)
    }

    writeStore(MOCK_STORAGE_KEYS.redeemedCodes, {
      ...redeemedCodes,
      [normalized]: configuredFor,
    })
    return { ...buddyPlusSnapshot(), completed: true }
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

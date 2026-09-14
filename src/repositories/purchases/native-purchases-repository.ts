import { LOG_LEVEL, Purchases, type PurchasesError, type PurchasesPackage } from '@revenuecat/purchases-capacitor'

import { env } from '@/config/env'
import {
  toEntitlementSnapshot,
  toSubscriptionOffering,
} from '@/repositories/purchases/purchases-mapper'
import type {
  PurchaseResult,
  PurchasesRepository,
} from '@/repositories/purchases/purchases-repository'

const isUserCancelled = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as PurchasesError).userCancelled === true

let configuredFor: string | null = null
/**
 * The raw store package objects behind the last-fetched offering, keyed by
 * the id `getOffering()` handed out. `purchasePackage()` needs the real
 * object, but it never leaves this file — same rule as a Firestore cursor.
 */
let packagesById = new Map<string, PurchasesPackage>()

/**
 * Real purchases on the Capacitor Android app, via the official
 * `@revenuecat/purchases-capacitor` SDK. Never imported directly by a
 * component — only through `repositories.ts`.
 */
export const nativePurchasesRepository: PurchasesRepository = {
  async configure(appUserId) {
    if (configuredFor === appUserId) return
    await Purchases.configure({
      apiKey: env.revenueCat.androidApiKey ?? '',
      appUserID: appUserId,
    })
    // Verbose only in dev; never logs a token, a price or a customer id.
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
    }
    configuredFor = appUserId
  },

  async getOffering() {
    const offerings = await Purchases.getOfferings()
    const current = offerings.current
    if (!current) return null
    packagesById = new Map(current.availablePackages.map((pkg) => [pkg.identifier, pkg]))
    return toSubscriptionOffering(current)
  },

  async getEntitlements() {
    const { customerInfo } = await Purchases.getCustomerInfo()
    return toEntitlementSnapshot(customerInfo)
  },

  async purchasePackage(packageId): Promise<PurchaseResult> {
    const aPackage = packagesById.get(packageId)
    if (!aPackage) {
      throw new Error('This plan is no longer available. Please try again.')
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage })
      return { ...toEntitlementSnapshot(customerInfo), completed: true }
    } catch (error) {
      if (isUserCancelled(error)) {
        return { activeEntitlementIds: [], completed: false }
      }
      throw error
    }
  },

  async restorePurchases() {
    const { customerInfo } = await Purchases.restorePurchases()
    return toEntitlementSnapshot(customerInfo)
  },

  subscribeToEntitlements(onChange, onError) {
    let callbackId: string | undefined
    let cancelled = false

    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      if (!cancelled) onChange(toEntitlementSnapshot(customerInfo))
    })
      .then((id) => {
        if (cancelled) {
          void Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: id })
        } else {
          callbackId = id
        }
      })
      .catch((error: unknown) => {
        onError(error instanceof Error ? error : new Error('Could not watch subscription status.'))
      })

    return () => {
      cancelled = true
      if (callbackId) void Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: callbackId })
    }
  },

  async reset() {
    if (configuredFor === null) return
    await Purchases.logOut()
    configuredFor = null
    packagesById = new Map()
  },
}

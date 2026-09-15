import { createContext } from 'react'

import type { PaywallOutcome } from '@/repositories/purchases/purchases-repository'
import type { PurchaseOutcome, SubscriptionOffering, SubscriptionState } from '@/types/subscription'

export interface SubscriptionContextValue {
  /** `'unknown'`/`'loading'`/`'error'` are all treated as NOT entitled — see `src/lib/capabilities.ts`. */
  state: SubscriptionState
  isBuddyPlus: boolean
  /** `null` until loaded, or on the web/mock stand-in where there is no store. */
  offering: SubscriptionOffering | null
  isLoadingOffering: boolean
  offeringError: string
  purchase: (packageId: string) => Promise<PurchaseOutcome>
  restore: () => Promise<void>
  refreshOffering: () => void
  /**
   * The RevenueCat-hosted Paywall UI (native Android only —
   * `'not-presented'` on the web, or if no Paywall is designed yet in the
   * dashboard). The caller falls back to `offering`'s own package list.
   */
  presentPaywall: () => Promise<PaywallOutcome>
  /** The RevenueCat-hosted Customer Center (manage/cancel), native only. */
  presentCustomerCenter: () => Promise<void>
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

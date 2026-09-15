import { createContext } from 'react'

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
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

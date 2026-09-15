import { useContext } from 'react'

import { SubscriptionContext } from '@/providers/subscription-context'

/** Buddy+ entitlement and the current Buddy+ offering. See `SubscriptionProvider`. */
export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used inside SubscriptionProvider')
  }
  return context
}

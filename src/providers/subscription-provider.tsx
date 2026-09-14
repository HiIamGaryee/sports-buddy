import { useCallback, useEffect, useMemo, useState } from 'react'

import { isBuddyPlus as computeIsBuddyPlus } from '@/lib/capabilities'
import { SubscriptionContext } from '@/providers/subscription-context'
import { useAuth } from '@/hooks/use-auth'
import { purchasesService } from '@/services/purchases/purchases-service'
import type { PurchaseOutcome, SubscriptionOffering, SubscriptionState } from '@/types/subscription'

interface OfferingState {
  userId: string | null
  offering: SubscriptionOffering | null
  isLoading: boolean
  error: string
}

const initialOfferingState = (userId: string | null): OfferingState => ({
  userId,
  offering: null,
  isLoading: userId !== null,
  error: '',
})

/**
 * The single source of truth for Buddy+ entitlement — RevenueCat is
 * configured with the signed-in Sports Buddy uid as its App User ID, so the
 * subscription travels with the account rather than the device.
 *
 * Mounted inside `ProtectedRoute`, so no purchases call ever runs on the
 * login, register or onboarding screens. On the web/mock stand-in
 * (`webPurchasesRepository`) this resolves to `'free'` and never changes —
 * see `docs/monetization.md`.
 */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState<SubscriptionState>('unknown')
  const [offeringState, setOfferingState] = useState<OfferingState>(() =>
    initialOfferingState(userId),
  )
  const [offeringReloadToken, setOfferingReloadToken] = useState(0)

  if (offeringState.userId !== userId) setOfferingState(initialOfferingState(userId))

  useEffect(() => {
    if (!userId) {
      setState('unknown')
      return
    }
    let active = true
    setState('loading')

    purchasesService
      .configure(userId)
      .then(() => purchasesService.getState())
      .then((loaded) => {
        if (active) setState(loaded)
      })
      .catch(() => {
        if (active) setState('error')
      })

    // One scoped listener per signed-in user — mirrors `ConnectionProvider`.
    const unsubscribe = purchasesService.subscribe(
      (updated) => {
        if (active) setState(updated)
      },
      () => {
        // A transient watch failure does not need its own UI; the next
        // explicit check (purchase, restore, reload) will retry.
      },
    )

    return () => {
      active = false
      unsubscribe()
      void purchasesService.reset()
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    const key = userId

    purchasesService
      .getOffering()
      .then((offering) => {
        if (active) {
          setOfferingState({ userId: key, offering, isLoading: false, error: '' })
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setOfferingState({
          userId: key,
          offering: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "We couldn't load Buddy+ plans.",
        })
      })

    return () => {
      active = false
    }
  }, [userId, offeringReloadToken])

  const purchase = useCallback(async (packageId: string): Promise<PurchaseOutcome> => {
    const result = await purchasesService.purchase(packageId)
    setState(result.state)
    return result.outcome
  }, [])

  const restore = useCallback(async () => {
    setState(await purchasesService.restore())
  }, [])

  const refreshOffering = useCallback(() => setOfferingReloadToken((token) => token + 1), [])

  const value = useMemo(
    () => ({
      state,
      isBuddyPlus: computeIsBuddyPlus(state),
      offering: offeringState.offering,
      isLoadingOffering: offeringState.isLoading,
      offeringError: offeringState.error,
      purchase,
      restore,
      refreshOffering,
    }),
    [state, offeringState, purchase, restore, refreshOffering],
  )

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  )
}

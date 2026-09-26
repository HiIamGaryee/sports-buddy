import { useCallback, useEffect, useMemo, useState } from 'react'

import { isBuddyPlus as computeIsBuddyPlus } from '@/lib/capabilities'
import { SubscriptionContext } from '@/providers/subscription-context'
import { useAuth } from '@/hooks/use-auth'
import { promoCodeService } from '@/services/purchases/promo-code-service'
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
 * (`webPurchasesRepository`) this resolves to `'free'` unless the seeded demo
 * account or a valid local demo code is used — see `docs/monetization.md`.
 */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState<SubscriptionState>('unknown')
  const [offeringState, setOfferingState] = useState<OfferingState>(() =>
    initialOfferingState(userId),
  )
  const [offeringReloadToken, setOfferingReloadToken] = useState(0)
  /** Buddy+ granted by a redeemed promo code, for THIS signed-in account. */
  const [promo, setPromo] = useState({ userId, active: false })

  if (offeringState.userId !== userId) setOfferingState(initialOfferingState(userId))
  if (promo.userId !== userId) setPromo({ userId, active: false })

  useEffect(() => {
    if (!userId) return
    let active = true
    void promoCodeService.hasRedemption(userId).then((hasPromo) => {
      if (active && hasPromo) setPromo({ userId, active: true })
    })
    return () => {
      active = false
    }
  }, [userId])

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

  const redeemCode = useCallback(
    async (code: string): Promise<PurchaseOutcome> => {
      if (!userId) throw new Error('You need to be signed in to redeem a code.')
      await promoCodeService.redeem(userId, code)
      setPromo({ userId, active: true })
      return 'purchased'
    },
    [userId],
  )

  const restore = useCallback(async () => {
    setState(await purchasesService.restore())
  }, [])

  const refreshOffering = useCallback(() => setOfferingReloadToken((token) => token + 1), [])

  const presentPaywall = useCallback(async () => {
    const result = await purchasesService.presentPaywallIfNeeded()
    setState(result.state)
    return result.outcome
  }, [])

  const presentCustomerCenter = useCallback(async () => {
    await purchasesService.presentCustomerCenter()
    // The Customer Center can cancel/change a plan from inside itself, with
    // no event this provider's listener is guaranteed to have caught yet.
    setState(await purchasesService.getState())
  }, [])

  // A promo grant counts exactly like a RevenueCat entitlement everywhere.
  const effectiveState: SubscriptionState =
    promo.active && promo.userId === userId ? 'buddy_plus' : state

  const value = useMemo(
    () => ({
      state: effectiveState,
      isBuddyPlus: computeIsBuddyPlus(effectiveState),
      offering: offeringState.offering,
      isLoadingOffering: offeringState.isLoading,
      offeringError: offeringState.error,
      purchase,
      redeemCode,
      restore,
      refreshOffering,
      presentPaywall,
      presentCustomerCenter,
    }),
    [effectiveState, offeringState, purchase, redeemCode, restore, refreshOffering, presentPaywall, presentCustomerCenter],
  )

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  )
}

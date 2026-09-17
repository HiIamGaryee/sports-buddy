import { useState } from 'react'
import {
  Check,
  LockKeyhole,
  Settings2,
  Sparkles,
} from 'lucide-react'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { MAX_BUDDY_PLUS_SPORTS } from '@/constants/sports'
import general from '@/data/general.json'
import { useSubscription } from '@/hooks/use-subscription'
import type { SubscriptionPackage } from '@/types/subscription'

const PREMIUM_FILTER_COPY = general.discover.premiumFilters

const PLAN_FEATURES = [
  {
    label: 'Sports on your profile',
    free: 'Up to 5 sports',
    buddyPlus: `Up to ${MAX_BUDDY_PLUS_SPORTS} sports`,
  },
  {
    label: 'Active plans per Buddy',
    free: '1 active plan',
    buddyPlus: 'Multiple active plans',
  },
  {
    label: general.notifications.activityReminders.label,
    free: null,
    buddyPlus: 'Before planned sessions',
  },
  {
    label: PREMIUM_FILTER_COPY.title,
    free: 'Basic filters',
    buddyPlus: `Date, popularity and ${PREMIUM_FILTER_COPY.items.length - 2} more filters`,
  },
  {
    label: 'Reliability-based discovery',
    free: null,
    buddyPlus: 'Prioritise reliable Buddies',
  },
  {
    label: 'Group activities',
    free: 'Core access',
    buddyPlus: 'Unlimited access',
  },
  {
    label: 'Sports insights',
    free: 'Basic recap',
    buddyPlus: 'Advanced trends',
  },
] as const

function PlanFeatures({ isBuddyPlus }: { isBuddyPlus: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {PLAN_FEATURES.map(({ label, free, buddyPlus }) => {
        const value = isBuddyPlus ? buddyPlus : free
        const isIncluded = value !== null

        return (
          <li key={label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${isIncluded ? 'bg-primary/14 text-primary' : 'bg-muted text-muted-foreground'}`}
            >
              {isIncluded ? (
                <Check aria-hidden className="size-3.5" />
              ) : (
                <LockKeyhole aria-hidden className="size-3" />
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-small font-semibold text-card-foreground">{label}</span>
              <span className="text-caption text-muted-foreground">
                {value ?? 'Buddy+ only'}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PackageOption({
  option,
  isBusy,
  onSelect,
}: {
  option: SubscriptionPackage
  isBusy: boolean
  onSelect: () => void
}) {
  return (
    <Button
      variant="outline"
      disabled={isBusy}
      onClick={onSelect}
      className="h-auto w-full justify-between gap-4 px-4 py-3 text-left"
    >
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <span className="text-title text-foreground">{option.title}</span>
        <span className="text-caption text-muted-foreground">{option.description}</span>
      </span>
      <span className="shrink-0 text-body-small font-semibold text-primary">
        {isBusy
          ? 'Processing…'
          : `${option.priceString}${option.periodLabel ? ` / ${option.periodLabel}` : ''}`}
      </span>
    </Button>
  )
}

/**
 * `/buddy-plus` — the one premium tier. Prices and periods are always
 * RevenueCat's own localized store strings; nothing here hardcodes a price.
 *
 * The primary path is RevenueCat's own hosted Paywall UI (designed in the
 * dashboard, shown via `presentPaywall()`) — the modern, recommended way to
 * sell a RevenueCat entitlement. The package list below it is a FALLBACK,
 * shown only once `presentPaywall()` reports `'not-presented'`: on the
 * web/mock stand-in (no native Paywall exists there), or if nobody has
 * designed a Paywall for the current offering yet. Nothing here fakes a
 * purchase on the web — see `webPurchasesRepository`.
 */
export function PaywallPage() {
  const {
    isBuddyPlus,
    offering,
    isLoadingOffering,
    offeringError,
    purchase,
    restore,
    refreshOffering,
    presentPaywall,
    presentCustomerCenter,
  } = useSubscription()
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const featuredPackage = offering?.packages[0]

  const openPaywall = async () => {
    setIsPresentingPaywall(true)
    setError('')
    setFeedback('')
    try {
      const outcome = await presentPaywall()
      if (outcome === 'purchased') setFeedback("You're on Buddy+. Enjoy the full app.")
      else if (outcome === 'restored') setFeedback('Your Buddy+ purchase was restored.')
      else if (outcome === 'not-presented') setShowFallback(true)
      // 'cancelled' and 'error' need no message of their own: the member
      // just sees the paywall close, or (on error) can try the fallback.
      if (outcome === 'error') setShowFallback(true)
    } catch (presentError) {
      setError(
        presentError instanceof Error
          ? presentError.message
          : "We couldn't open the paywall. Please try again.",
      )
      setShowFallback(true)
    } finally {
      setIsPresentingPaywall(false)
    }
  }

  const choose = async (packageId: string) => {
    setBusyPackageId(packageId)
    setError('')
    setFeedback('')
    try {
      const outcome = await purchase(packageId)
      if (outcome === 'purchased') setFeedback("You're on Buddy+. Enjoy the full app.")
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "We couldn't complete that purchase. Please try again.",
      )
    } finally {
      setBusyPackageId(null)
    }
  }

  const doRestore = async () => {
    setIsRestoring(true)
    setError('')
    setFeedback('')
    try {
      await restore()
      setFeedback('Purchases restored.')
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "We couldn't restore your purchases. Please try again.",
      )
    } finally {
      setIsRestoring(false)
    }
  }

  const openCustomerCenter = async () => {
    setIsManaging(true)
    setError('')
    try {
      await presentCustomerCenter()
    } catch (manageError) {
      setError(
        manageError instanceof Error
          ? manageError.message
          : "We couldn't open subscription management.",
      )
    } finally {
      setIsManaging(false)
    }
  }

  return (
    <>
      <AppHeader
        title="Buddy+"
        subtitle="Find better-matched people. Play more. Plan without limits."
        size="wide"
        showBack
      />
      <PageContainer size="wide" className="gap-8 md:gap-10">
        <section className="flex flex-col items-center gap-4 py-2 text-center md:py-6">
          <span className="flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-caption text-foreground">
            <Sparkles aria-hidden className="size-3.5 text-primary" />
            Pricing plans
          </span>
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-display text-foreground">Simple pricing. No surprises.</h2>
            <p className="text-body text-muted-foreground">
              Start free. Upgrade when you&apos;re ready to discover more, plan more and play more.
            </p>
          </div>
          {isBuddyPlus && (
            <StatusPill tone="success" icon={Check}>
              Buddy+ active
            </StatusPill>
          )}
        </section>

        <section className="grid items-stretch gap-5 lg:grid-cols-2">
          <Card variant="elevated" className="h-full">
            <CardContent className="flex h-full flex-col gap-7 p-1">
              <div className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5">
                <span className="text-label text-muted-foreground uppercase">Free</span>
                <div className="flex flex-col gap-1">
                  <span className="text-heading-2 text-card-foreground">Perfect for getting started</span>
                  <span className="text-body-small text-muted-foreground">
                    Build your profile and find your first sports Buddy.
                  </span>
                </div>
                <div className="flex items-end gap-2 pt-2">
                  <span className="text-display text-card-foreground">Free</span>
                  <span className="pb-1 text-body-small text-muted-foreground">forever</span>
                </div>
                <Button variant="outline" size="lg" disabled>
                  Current plan
                </Button>
              </div>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <span className="text-title text-card-foreground">What&apos;s included</span>
                <PlanFeatures isBuddyPlus={false} />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="h-full border-primary/45 bg-primary-gradient-soft shadow-md">
            <CardContent className="flex h-full flex-col gap-7 p-1">
              <div className="flex flex-col gap-3 rounded-xl bg-card/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-label text-primary uppercase">Buddy+</span>
                  <span className="rounded-full bg-primary-gradient px-3 py-1 text-caption text-primary-foreground">
                    Recommended
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-heading-2 text-card-foreground">For more consistent play</span>
                  <span className="text-body-small text-muted-foreground">
                    More control for finding the right people and keeping plans moving.
                  </span>
                </div>
                <div className="flex items-end gap-2 pt-2">
                  {featuredPackage ? (
                    <>
                      <span className="text-display text-primary-gradient">
                        {featuredPackage.priceString}
                      </span>
                      <span className="pb-1 text-body-small text-muted-foreground">
                        {featuredPackage.periodLabel ? `/ ${featuredPackage.periodLabel}` : 'per plan'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-heading-2 text-primary-gradient">Store pricing</span>
                      <span className="pb-1 text-body-small text-muted-foreground">localized in app</span>
                    </>
                  )}
                </div>
                {isBuddyPlus ? (
                  <Button variant="outline" size="lg" disabled={isManaging} onClick={() => void openCustomerCenter()}>
                    <Settings2 className="size-4" />
                    {isManaging ? 'Opening…' : 'Manage subscription'}
                  </Button>
                ) : (
                  <Button size="lg" disabled={isPresentingPaywall} onClick={() => void openPaywall()}>
                    {isPresentingPaywall ? 'Opening…' : 'Upgrade to Buddy+'}
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-4 px-4 pb-4">
                <span className="text-title text-card-foreground">Everything in Free, plus</span>
                <PlanFeatures isBuddyPlus />

                {feedback && (
                  <p role="status" className="text-body-small text-muted-foreground">
                    {feedback}
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-body-small text-destructive">
                    {error}
                  </p>
                )}

                {!isBuddyPlus && showFallback && (
                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    <span className="text-label text-card-foreground">Choose your billing option</span>
                    {isLoadingOffering && (
                      <>
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                      </>
                    )}

                    {!isLoadingOffering && offeringError && (
                      <Card variant="subtle">
                        <CardContent className="flex flex-col gap-3">
                          <p className="text-body-small text-destructive">{offeringError}</p>
                          <Button variant="outline" onClick={refreshOffering}>
                            Try again
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {!isLoadingOffering && !offeringError && !offering && (
                      <Card variant="subtle">
                        <CardContent>
                          <p className="text-body-small text-card-foreground">
                            Buddy+ purchases are available in the Sports Buddy Android app.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {!isLoadingOffering && offering && offering.packages.length === 0 && (
                      <Card variant="subtle">
                        <CardContent>
                          <p className="text-body-small text-card-foreground">
                            Buddy+ isn&apos;t available to purchase right now. Please check back soon.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {!isLoadingOffering &&
                      offering?.packages.map((option) => (
                        <PackageOption
                          key={option.id}
                          option={option}
                          isBusy={busyPackageId === option.id}
                          onSelect={() => void choose(option.id)}
                        />
                      ))}
                  </div>
                )}

                {!isBuddyPlus && (
                  <Button variant="ghost" disabled={isRestoring} onClick={() => void doRestore()}>
                    {isRestoring ? 'Restoring…' : 'Restore purchases'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </>
  )
}

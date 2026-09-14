import { useState } from 'react'
import { Check, Filter, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { useSubscription } from '@/hooks/use-subscription'
import type { SubscriptionPackage } from '@/types/subscription'

const BENEFITS = [
  {
    icon: Filter,
    title: 'Advanced discovery filters',
    description: 'Narrow buddies by more than sport, skill and area.',
  },
  {
    icon: ShieldCheck,
    title: 'Reliability-based discovery',
    description: 'Prioritize sports buddies with a strong show-up rate.',
  },
  {
    icon: Users,
    title: 'Unlimited group activities',
    description: 'Join or host as many activities as you want at once.',
  },
  {
    icon: TrendingUp,
    title: 'Advanced sports insights',
    description: 'Month-over-month trends beyond the free basic recap.',
  },
] as const

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
    <Card variant="interactive" className="w-full">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-title text-card-foreground">{option.title}</span>
          <span className="text-body-small text-muted-foreground">
            {option.priceString}
            {option.periodLabel ? ` / ${option.periodLabel}` : ''}
          </span>
        </div>
        <Button size="sm" disabled={isBusy} onClick={onSelect} className="shrink-0">
          {isBusy ? 'Processing…' : 'Choose'}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * `/buddy-plus` — the one premium tier. Prices and periods are always
 * RevenueCat's own localized store strings; nothing here hardcodes a price.
 *
 * On the web/mock stand-in `offering` is always `null` (no store to buy
 * from), so the page explains that plainly instead of faking a purchase —
 * see `webPurchasesRepository`.
 */
export function PaywallPage() {
  const { isBuddyPlus, offering, isLoadingOffering, offeringError, purchase, restore, refreshOffering } =
    useSubscription()
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

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

  return (
    <>
      <AppHeader title="Buddy+" subtitle="Find better-matched people. Play more. Plan without limits." size="default" showBack />
      <PageContainer size="default">
        <Card variant="elevated">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground">
              <Sparkles aria-hidden className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-heading-2 text-primary-gradient">Buddy+</span>
              {isBuddyPlus ? (
                <StatusPill tone="success" icon={Check} className="mx-auto">
                  Active
                </StatusPill>
              ) : (
                <span className="text-body-small text-muted-foreground">
                  One plan. Everything unlocked.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Icon aria-hidden className="size-4.5" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-title text-foreground">{title}</span>
                <span className="text-body-small text-muted-foreground">{description}</span>
              </div>
            </div>
          ))}
        </section>

        {isBuddyPlus ? (
          <Card variant="subtle">
            <CardContent>
              <p className="text-body text-card-foreground">
                You already have Buddy+. Manage or cancel your subscription from Google Play.
              </p>
            </CardContent>
          </Card>
        ) : (
          <section className="flex flex-col gap-3">
            {isLoadingOffering && (
              <>
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
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
                  <p className="text-body text-card-foreground">
                    Buddy+ purchases are only available in the Sports Buddy Android app.
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoadingOffering && offering && offering.packages.length === 0 && (
              <Card variant="subtle">
                <CardContent>
                  <p className="text-body text-card-foreground">
                    Buddy+ isn't available to purchase right now. Please check back soon.
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

            <Button variant="ghost" disabled={isRestoring} onClick={() => void doRestore()}>
              {isRestoring ? 'Restoring…' : 'Restore purchases'}
            </Button>
          </section>
        )}
      </PageContainer>
    </>
  )
}

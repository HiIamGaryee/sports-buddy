import { useState } from 'react'
import {
  Check,
  LockKeyhole,
  Settings2,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import diamondIcon from '@/assets/svg/diamond-search-svgrepo-com.svg'
import {
  FREE_MAX_HOSTED_GROUP_ACTIVITIES,
  FREE_MAX_JOINED_GROUP_ACTIVITIES,
  isMockRedeemCodeFormat,
  normalizeMockRedeemCode,
} from '@/constants/entitlements'
import { MAX_BUDDY_PLUS_SPORTS } from '@/constants/sports'
import general from '@/data/general.json'
import { useSubscription } from '@/hooks/use-subscription'
import type { SubscriptionPackage } from '@/types/subscription'

const PREMIUM_FILTER_COPY = general.discover.premiumFilters

/**
 * Every row here must be something Buddy+ REALLY changes in the app today.
 * A locked row on a paywall is a promise, and a member who pays will go
 * looking for it — so nothing aspirational belongs in this list.
 */
const PLAN_FEATURES = [
  {
    label: 'Sports on your profile',
    detail:
      'How many sports you can list. More sports means you turn up in more people’s Discover results.',
    free: 'Up to 5',
    buddyPlus: `Up to ${MAX_BUDDY_PLUS_SPORTS}`,
  },
  {
    label: 'Group activities you host at once',
    detail:
      'Open sessions you organise and others join. The cap counts only sessions that have not happened yet — once one is over, the slot frees up.',
    free: `${FREE_MAX_HOSTED_GROUP_ACTIVITIES}`,
    buddyPlus: 'Unlimited',
  },
  {
    label: 'Group activities you join at once',
    detail:
      'Other people’s sessions you have a place in. Same rule: finished sessions stop counting.',
    free: `${FREE_MAX_JOINED_GROUP_ACTIVITIES}`,
    buddyPlus: 'Unlimited',
  },
  {
    label: PREMIUM_FILTER_COPY.title,
    detail: `Narrow Discover by ${PREMIUM_FILTER_COPY.items.map(({ label }) => label.toLowerCase()).join(', ')}. Free members browse with location and activity only.`,
    free: null,
    buddyPlus: `All ${PREMIUM_FILTER_COPY.items.length} filters`,
  },
  {
    label: 'Discover, chat and planning',
    detail:
      'Compatibility matching, connecting, unlimited messages, and planning a session together down to the venue. Never limited.',
    free: 'Included',
    buddyPlus: 'Included',
  },
  {
    label: 'QR check-in, reliability and recap',
    detail:
      'Scan the organiser’s code at the venue to verify you turned up, build a show-up rate on your profile, and get your monthly recap. Free for everyone.',
    free: 'Included',
    buddyPlus: 'Included',
  },
] as const

function PlanCell({ value }: { value: string | null }) {
  return (
    <span className="flex flex-col items-center gap-1 text-center">
      <span
        className={`flex size-5 items-center justify-center rounded-full ${value === null ? 'pricing-lock' : 'pricing-check'}`}
      >
        {value === null ? (
          <LockKeyhole aria-hidden className="size-3" />
        ) : (
          <Check aria-hidden className="size-3.5" />
        )}
      </span>
      <span className="text-caption text-muted-foreground">{value ?? 'Not included'}</span>
    </span>
  )
}

/**
 * The side-by-side comparison: one row per feature, both columns always
 * visible, so a member can see what Free does and does not include without
 * switching anything. The column they are on is marked.
 */
function PlanComparison({ isBuddyPlus }: { isBuddyPlus: boolean }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-heading-3 font-bold text-foreground">Compare plans</h3>
      <Card variant="subtle">
        <CardContent className="p-0">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-[52%] px-4 py-3 text-left text-label text-muted-foreground">
                  Feature
                </th>
                <th scope="col" className="px-2 py-3 text-center text-label text-card-foreground">
                  Free
                  {!isBuddyPlus && (
                    <span className="block text-caption font-normal text-primary">Your plan</span>
                  )}
                </th>
                <th scope="col" className="px-2 py-3 text-center text-label text-card-foreground">
                  Buddy+
                  {isBuddyPlus && (
                    <span className="block text-caption font-normal text-primary">Your plan</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map(({ label, detail, free, buddyPlus }) => (
                <tr key={label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-3 text-left">
                    <span className="flex flex-col gap-1">
                      <span className="text-body-small font-semibold text-card-foreground">
                        {label}
                      </span>
                      {/* Says what the row actually means: "2" on its own told
                          nobody what was being counted, or when it resets. */}
                      <span className="text-caption font-normal text-muted-foreground">
                        {detail}
                      </span>
                    </span>
                  </th>
                  <td className="px-2 py-3 align-top">
                    <PlanCell value={free} />
                  </td>
                  <td className="px-2 py-3 align-top">
                    <PlanCell value={buddyPlus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  )
}

/**
 * What makes one billing option different from the others, in our own words.
 * The store's own `description` is often empty or identical across packages,
 * which left three rows that looked the same apart from the price.
 *
 * Deliberately no numbers: prices and periods only ever come from RevenueCat's
 * localized strings, so this can never contradict what the store charges.
 */
function describePackage(option: SubscriptionPackage): string {
  const id = `${option.id} ${option.productId}`.toLowerCase()
  if (id.includes('lifetime')) return 'One payment. Buddy+ stays on your account — nothing renews.'
  if (id.includes('annual') || id.includes('year')) {
    return 'Billed once a year. Cheaper per month than paying monthly, and one payment instead of twelve.'
  }
  if (id.includes('month')) return 'Billed every month. Cancel any time and keep it until the month ends.'
  return option.description
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
      className="h-auto w-full justify-between gap-4 rounded-2xl px-5 py-4 text-left"
    >
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <span className="text-title text-foreground">{option.title}</span>
        <span className="text-caption break-words whitespace-normal text-muted-foreground">
          {describePackage(option)}
        </span>
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
 * The native path is RevenueCat's own hosted Paywall UI (designed in the
 * dashboard, shown via `presentPaywall()`). Browsers use the local demo-code
 * dialog because no web payment gateway is configured; see
 * `webPurchasesRepository`.
 */
export function PaywallPage() {
  const {
    isBuddyPlus,
    offering,
    isLoadingOffering,
    offeringError,
    purchase,
    redeemCode: redeemSubscriptionCode,
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
  const [isRedeemOpen, setIsRedeemOpen] = useState(false)
  const [redeemCodeInput, setRedeemCodeInput] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const featuredPackage = offering?.packages[0]

  const openPaywall = async () => {
    if (!Capacitor.isNativePlatform()) {
      setRedeemCodeInput('')
      setRedeemError('')
      setIsRedeemOpen(true)
      return
    }

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

  const redeem = async () => {
    const normalized = normalizeMockRedeemCode(redeemCodeInput)
    if (!isMockRedeemCodeFormat(normalized)) {
      setRedeemError('Use a code in the format BUDDY-XXXX-XXXX.')
      return
    }

    setIsRedeeming(true)
    setRedeemError('')
    try {
      const outcome = await redeemSubscriptionCode(normalized)
      if (outcome === 'purchased') {
        setFeedback("You're on Buddy+. Enjoy the full app.")
        setIsRedeemOpen(false)
        setRedeemCodeInput('')
      }
    } catch (redeemErrorValue) {
      setRedeemError(
        redeemErrorValue instanceof Error
          ? redeemErrorValue.message
          : "We couldn't redeem that code. Please try again.",
      )
    } finally {
      setIsRedeeming(false)
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
    } catch {
      // Store-backed screen: the RevenueCat Test Store has no Customer Center,
      // so say where a real subscription is cancelled instead of an error code.
      setError(
        'Subscription management is only available in the store build. On a real purchase, cancel from the Play Store subscriptions page.',
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
      <PageContainer size="wide" className="pricing-page gap-10 pt-8 pb-bottom-nav-space md:gap-14 md:pt-10 md:pb-16">
        <section className="pricing-reveal flex flex-col items-center gap-4 text-center">
          <span className="text-caption text-foreground">
            Pricing plans
          </span>
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-display font-extrabold text-foreground">Simple pricing. No surprises.</h2>
            <p className="text-body text-muted-foreground">
              Start free. Upgrade when you&apos;re ready to discover more, plan more and play more.
            </p>
          </div>
          <StatusPill tone={isBuddyPlus ? 'success' : 'neutral'} icon={isBuddyPlus ? Check : undefined}>
            {isBuddyPlus ? 'Your plan: Buddy+' : 'Your plan: Free'}
          </StatusPill>
        </section>

        <section className="grid items-stretch gap-6 md:grid-cols-2">
          <Card variant="elevated" className="pricing-card pricing-card-motion h-full rounded-2xl">
            <CardContent className="flex h-full flex-col gap-8 p-6">
              <div className="flex flex-col gap-3 rounded-2xl pricing-card-muted p-7">
                <span className="text-label text-muted-foreground uppercase">Free</span>
                <div className="flex flex-col gap-1">
                  <span className="text-heading-2 font-bold text-card-foreground">Perfect for getting started</span>
                  <span className="text-body-small text-muted-foreground">
                    Build your profile and find your first sports Buddy.
                  </span>
                </div>
                <div className="flex items-end gap-2 pt-2">
                  <span className="text-display font-extrabold text-card-foreground">Free</span>
                  <span className="pb-1 text-body-small text-muted-foreground">forever</span>
                </div>
                <Button variant="outline" size="lg" disabled className="rounded-2xl">
                  {isBuddyPlus ? 'Included in Buddy+' : 'Your current plan'}
                </Button>
              </div>
              <div className="flex flex-col gap-2 px-1 pb-1">
                <span className="text-heading-3 font-bold text-card-foreground">What&apos;s included</span>
                <p className="text-body-small text-muted-foreground">
                  The whole app: Discover, chat, planning, confirmed sessions, QR check-in and
                  your monthly recap. Free members can host{' '}
                  {FREE_MAX_HOSTED_GROUP_ACTIVITIES} and join{' '}
                  {FREE_MAX_JOINED_GROUP_ACTIVITIES} group activities at a time, and keep up to
                  5 sports on their profile.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="pricing-premium-frame pricing-premium-motion h-full rounded-2xl">
            <CardContent className="flex h-full flex-col gap-8 p-6">
              <div className="pricing-premium-panel flex flex-col gap-3 rounded-2xl p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-label text-pricing-accent uppercase">
                    <img src={diamondIcon} alt="" aria-hidden className="size-3.5" />
                    Buddy+
                  </span>
                  <span className="pricing-premium-cta pricing-badge-motion rounded-full px-3.5 py-1.5 text-caption font-semibold text-primary-foreground">
                    Recommended
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-heading-2 font-bold text-card-foreground">For more consistent play</span>
                  <span className="text-body-small text-muted-foreground">
                    More control for finding the right people and keeping plans moving.
                  </span>
                </div>
                <div className="flex items-end gap-2 pt-2">
                  {featuredPackage ? (
                    <>
                      <span className="text-display font-extrabold text-pricing-gradient">
                        {featuredPackage.priceString}
                      </span>
                      <span className="pb-1 text-body-small text-muted-foreground">
                        {featuredPackage.periodLabel ? `/ ${featuredPackage.periodLabel}` : 'per plan'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-heading-2 font-bold text-pricing-gradient">Store pricing</span>
                      <span className="pb-1 text-body-small text-muted-foreground">localized in app</span>
                    </>
                  )}
                </div>
                {isBuddyPlus ? (
                  <>
                    <StatusPill tone="success" icon={Check}>
                      Your current plan
                    </StatusPill>
                    {/* `h-auto` + wrapping text: a fixed-height button with
                        nowrap text clipped this label on a phone. */}
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-auto min-h-[60px] rounded-2xl px-4 py-3 text-center whitespace-normal"
                      disabled={isManaging}
                      onClick={() => void openCustomerCenter()}
                    >
                      <Settings2 className="size-4 shrink-0" />
                      {isManaging ? 'Opening…' : 'Manage or cancel Buddy+'}
                    </Button>
                    <p className="text-caption text-muted-foreground">
                      Cancelling keeps Buddy+ until the period you paid for ends.
                    </p>
                  </>
                ) : (
                  <Button size="lg" className="pricing-premium-cta pricing-cta-motion h-[60px] rounded-2xl font-bold text-primary-foreground" disabled={isPresentingPaywall} onClick={() => void openPaywall()}>
                    {isPresentingPaywall ? 'Opening…' : 'Upgrade to Buddy+'}
                  </Button>
                )}
                {!isBuddyPlus && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRedeemCodeInput('')
                      setRedeemError('')
                      setIsRedeemOpen(true)
                    }}
                  >
                    Have a redeem code?
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-4 px-1 pb-1">
                <span className="text-heading-3 font-bold text-card-foreground">Everything in Free, plus</span>
                <p className="text-body-small text-muted-foreground">
                  Unlimited group activities to host and join, up to{' '}
                  {MAX_BUDDY_PLUS_SPORTS} sports on your profile, and the{' '}
                  {PREMIUM_FILTER_COPY.items.length} advanced Discover filters.
                </p>

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
                  <div className="flex flex-col gap-3 border-t border-border pt-6">
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

                <Button variant="ghost" disabled={isRestoring} onClick={() => void doRestore()}>
                  {isRestoring ? 'Restoring…' : 'Restore purchases'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <PlanComparison isBuddyPlus={isBuddyPlus} />
      </PageContainer>

      <Dialog
        open={isRedeemOpen}
        onOpenChange={(open) => {
          setIsRedeemOpen(open)
          if (!open) {
            setRedeemCodeInput('')
            setRedeemError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redeem Buddy+</DialogTitle>
            <DialogDescription>
              Enter a valid demo subscription code to unlock Buddy+ on this browser.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void redeem()
            }}
          >
            <Input
              value={redeemCodeInput}
              onChange={(event) => {
                setRedeemCodeInput(event.target.value.toUpperCase())
                setRedeemError('')
              }}
              placeholder="BUDDY-7K4M-2Q9P"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(redeemError)}
              aria-describedby={redeemError ? 'redeem-code-error' : undefined}
            />
            {redeemError && (
              <p id="redeem-code-error" role="alert" className="text-body-small text-destructive">
                {redeemError}
              </p>
            )}
            <DialogFooter className="-mx-4 -mb-4">
              <Button type="button" variant="outline" onClick={() => setIsRedeemOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isRedeeming || !redeemCodeInput.trim()}>
                {isRedeeming ? 'Checking…' : 'Redeem code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

import { ChevronLeft } from 'lucide-react'

import { StickyActionBar } from '@/components/layout/sticky-action-bar'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/features/onboarding/components/onboarding-progress'

/**
 * Onboarding shell. One flow, one draft, one set of steps — only the
 * arrangement changes:
 *
 *   phone   sticky header, scrolling step, sticky CTA above the home indicator
 *   tablet  the same, in a wider readable column
 *   desktop the step title and progress become a fixed left column, with the
 *           step content and its CTA beside them, so a 1440px onboarding is
 *           not a phone strip with two enormous margins
 */
export function OnboardingLayout({
  step,
  total,
  title,
  subtitle,
  error,
  hint,
  ctaLabel,
  ctaDisabled,
  onBack,
  onContinue,
  children,
}: {
  step: number
  total: number
  title: string
  subtitle?: string
  error?: string
  hint?: string
  ctaLabel: string
  ctaDisabled?: boolean
  onBack?: () => void
  onContinue: () => void
  children: React.ReactNode
}) {
  const message = error ?? hint

  return (
    <div className="flex min-h-dvh flex-col bg-background pl-safe-left pr-safe-right lg:justify-center">
      <div className="mx-auto flex w-full max-w-default flex-1 flex-col lg:max-w-wide lg:flex-none lg:grid lg:grid-aside-start lg:items-start lg:gap-16 lg:px-gutter lg:py-16">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-surface-overlay px-gutter pt-safe-top pb-4 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex min-h-11 items-center gap-2">
            {onBack ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Go back"
                onClick={onBack}
                className="-ml-2 shrink-0"
              >
                <ChevronLeft className="size-5" />
              </Button>
            ) : (
              <span className="size-9 shrink-0 lg:hidden" />
            )}
            <OnboardingProgress step={step} total={total} />
          </div>
          <div className="flex flex-col gap-1 lg:gap-3">
            <h1 className="text-heading-1 text-foreground lg:text-display">
              {title}
            </h1>
            {subtitle && (
              <p className="text-body-small text-muted-foreground lg:text-body">
                {subtitle}
              </p>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:flex-none">
          <main className="flex flex-1 animate-in flex-col gap-4 px-gutter py-5 duration-200 ease-out fade-in-0 slide-in-from-bottom-1 lg:px-0 lg:py-0">
            {children}
          </main>

          <StickyActionBar className="lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            {message && (
              <p
                role={error ? 'alert' : undefined}
                className={
                  error
                    ? 'text-body-small text-destructive'
                    : 'text-body-small text-muted-foreground'
                }
              >
                {message}
              </p>
            )}
            <Button
              size="lg"
              onClick={onContinue}
              disabled={ctaDisabled}
              className="lg:w-auto lg:self-start lg:px-10"
            >
              {ctaLabel}
            </Button>
            <span className="h-2 lg:hidden" />
          </StickyActionBar>
        </div>
      </div>
    </div>
  )
}

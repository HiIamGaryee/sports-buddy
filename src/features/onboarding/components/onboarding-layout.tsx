import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/features/onboarding/components/onboarding-progress'

/** Onboarding shell: header + progress, scrolling content, sticky CTA. */
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
  return (
    <div className="flex min-h-dvh justify-center bg-background pl-safe-left pr-safe-right">
      <div className="flex w-full max-w-content flex-col border-border sm:border-x">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-background/85 px-page pt-safe-top pb-4 backdrop-blur-xl">
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
              <span className="size-9 shrink-0" />
            )}
            <OnboardingProgress step={step} total={total} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-heading-1 text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-body-small text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </header>

        <main className="flex flex-1 animate-in flex-col gap-4 px-page py-5 duration-200 ease-out fade-in-0 slide-in-from-bottom-1">
          {children}
        </main>

        <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background/90 px-page pt-4 pb-safe-bottom backdrop-blur-xl">
          {error ? (
            <p role="alert" className="text-body-small text-destructive">
              {error}
            </p>
          ) : (
            hint && (
              <p className="text-body-small text-muted-foreground">{hint}</p>
            )
          )}
          <Button size="lg" onClick={onContinue} disabled={ctaDisabled}>
            {ctaLabel}
          </Button>
          <span className="h-2" />
        </footer>
      </div>
    </div>
  )
}

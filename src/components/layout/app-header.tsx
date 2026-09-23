import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { MobileNavigationMenu } from '@/components/layout/mobile-navigation-menu'
import { cn } from '@/lib/utils'
import type { PageContainerSize } from '@/components/layout/page-container'

const SIZES = {
  narrow: 'max-w-narrow',
  default: 'max-w-default',
  wide: 'max-w-wide',
  full: 'max-w-full',
} as const

/**
 * Compact native top bar on a phone; a proper page heading from `md` up,
 * where there is room for a larger title and the action sits on the same
 * line with real breathing space.
 *
 * `size` should match the page's `PageContainer`, so the heading and the body
 * share one left edge instead of drifting apart on a wide screen.
 */
export function AppHeader({
  title,
  subtitle,
  size = 'default',
  showBack = false,
  action,
  transparent = false,
  onBack,
}: {
  title: string
  subtitle?: string
  size?: PageContainerSize
  showBack?: boolean
  action?: React.ReactNode
  transparent?: boolean
  onBack?: () => void
}) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 pt-safe-top',
        transparent
          ? 'bg-transparent'
          : 'border-b border-border bg-surface-overlay backdrop-blur-xl',
      )}
    >
      {/*
       * The gutter belongs on the SAME box that carries the max width, exactly
       * as `PageContainer` does it. With the padding on the outer `<header>`
       * instead, the centred max-width box started 18px further left than the
       * page body at any width where `max-w-wide` caps — so every page heading
       * sat slightly left of its own content.
       */}
      <div
        className={cn(
          'mx-auto flex w-full items-start gap-3 px-gutter',
          SIZES[size],
        )}
      >
        <div className="flex min-h-14 flex-1 items-center gap-2 py-3 md:min-h-16 md:py-6">
          {showBack && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Go back"
              onClick={onBack ?? (() => navigate(-1))}
              className="-ml-2 shrink-0"
            >
              <ChevronLeft className="size-5" />
            </Button>
          )}
          <MobileNavigationMenu />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-heading-1 text-foreground md:text-display">
              {title}
            </h1>
            {subtitle && (
              /* Wraps to two lines rather than being clipped: a cut-off
                 sentence reads as a layout bug, and there is room for it. */
              <p className="line-clamp-2 text-body-small text-muted-foreground md:line-clamp-none md:text-body">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          /* `shrink-0` so a long title can never push the page actions (the
             refresh button on Discover) past the right edge of the screen. */
          <div className="flex shrink-0 items-center py-3 md:py-6">{action}</div>
        )}
      </div>
    </header>
  )
}

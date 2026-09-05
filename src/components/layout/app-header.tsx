import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
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
}: {
  title: string
  subtitle?: string
  size?: PageContainerSize
  showBack?: boolean
  action?: React.ReactNode
  transparent?: boolean
}) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 px-gutter pt-safe-top',
        transparent
          ? 'bg-transparent'
          : 'border-b border-border bg-surface-overlay backdrop-blur-xl',
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full items-start gap-3',
          SIZES[size],
        )}
      >
        <div className="flex min-h-14 flex-1 items-center gap-2 py-3 md:min-h-16 md:py-5">
          {showBack && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="-ml-2 shrink-0"
            >
              <ChevronLeft className="size-5" />
            </Button>
          )}
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-heading-1 text-foreground md:text-display">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-body-small text-muted-foreground md:text-body">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex items-center py-3 md:py-5">{action}</div>
        )}
      </div>
    </header>
  )
}

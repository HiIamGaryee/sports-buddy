import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { MobileNavigationMenu } from '@/components/layout/mobile-navigation-menu'
import {
  getPageContainerSizeClass,
  type PageContainerSize,
} from '@/components/layout/page-container-config'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HEADER_VARIANTS = [
  { name: 'list', showBack: false, showMenu: true },
  { name: 'detail', showBack: true, showMenu: false },
] as const

export type AppHeaderVariant = (typeof HEADER_VARIANTS)[number]['name']

/**
 * Shared application header. Its width class is resolved by the same source
 * as `PageContainer`, so the header and page body always share an edge.
 */
export function AppHeader({
  title,
  subtitle,
  size = 'default',
  variant = 'list',
  action,
  transparent = false,
  onBack,
}: {
  title: string
  subtitle?: string
  size?: PageContainerSize
  variant?: AppHeaderVariant
  action?: React.ReactNode
  transparent?: boolean
  onBack?: () => void
}) {
  const navigate = useNavigate()
  const config =
    HEADER_VARIANTS.find(({ name }) => name === variant) ?? HEADER_VARIANTS[0]

  return (
    <header
      className={cn(
        'sticky top-0 z-30 shrink-0 border-b border-border pt-safe-top',
        transparent ? 'bg-transparent' : 'bg-surface-overlay backdrop-blur-xl',
      )}
    >
      <div
        className={cn(
          'mx-auto flex h-18 w-full min-w-0 items-center gap-2 px-gutter',
          getPageContainerSizeClass(size),
        )}
      >
        {config.showBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Go back"
            onClick={onBack ?? (() => navigate(-1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {config.showMenu && <MobileNavigationMenu />}

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h1 className="truncate text-heading-1 text-foreground">{title}</h1>
          {subtitle && (
            <p className="truncate text-body-small text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {action && <div className="flex shrink-0 items-center">{action}</div>}
      </div>
    </header>
  )
}

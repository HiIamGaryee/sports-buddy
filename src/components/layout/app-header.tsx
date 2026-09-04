import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  action,
  transparent = false,
}: {
  title: string
  subtitle?: string
  showBack?: boolean
  action?: React.ReactNode
  transparent?: boolean
}) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-start gap-3 px-page pt-safe-top',
        transparent
          ? 'bg-transparent'
          : 'border-b border-border bg-background/85 backdrop-blur-xl',
      )}
    >
      <div className="flex min-h-14 flex-1 items-center gap-2 py-3">
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
          <h1 className="truncate text-heading-1 text-foreground">{title}</h1>
          {subtitle && (
            <p className="truncate text-body-small text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center py-3">{action}</div>}
    </header>
  )
}

import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-page py-10 text-center md:py-14',
        className,
      )}
    >
      {Icon && (
        <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <p className="text-title text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-body-small text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

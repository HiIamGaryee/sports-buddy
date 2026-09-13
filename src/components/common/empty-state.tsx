import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * THE "nothing here" surface. The `action` slot exists because every caller
 * was rendering its own button in a wrapper `div` underneath, which put the
 * recovery control outside the dashed panel it belonged to.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  role,
  className,
}: {
  icon?: LucideIcon
  /** An imported illustration asset. Takes precedence over `icon`. */
  illustration?: string
  title: string
  description?: string
  action?: React.ReactNode
  /** `"alert"` when the state reports a failure, so it is announced. */
  role?: 'alert'
  className?: string
}) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-gutter py-10 text-center md:py-14',
        className,
      )}
    >
      {illustration ? (
        <span className="mb-1 grid size-20 place-items-center overflow-hidden rounded-2xl bg-surface-subtle p-3 md:size-24">
          <img src={illustration} alt="" aria-hidden className="size-full" />
        </span>
      ) : (
        Icon && (
          <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-subtle text-muted-foreground">
            <Icon aria-hidden className="size-5" />
          </span>
        )
      )}
      <p className="text-title text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-body-small text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

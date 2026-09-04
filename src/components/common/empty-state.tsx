import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-page py-10 text-center">
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

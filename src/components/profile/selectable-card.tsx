import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Tactile selection card used for sports, intents and intensity. */
export function SelectableCard({
  icon: Icon,
  title,
  description,
  selected,
  disabled,
  compact = false,
  onClick,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  selected: boolean
  disabled?: boolean
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40',
        compact && 'flex-col items-start gap-2',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-input',
      )}
    >
      {Icon && (
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-title text-card-foreground">{title}</span>
        {description && (
          <span className="text-body-small text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <Check
        aria-hidden
        className={cn(
          'size-5 shrink-0 text-primary transition-opacity',
          compact && 'absolute top-4 right-4',
          selected ? 'opacity-100' : 'opacity-0',
        )}
      />
    </button>
  )
}

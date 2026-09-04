import { cn } from '@/lib/utils'

/**
 * Pill toggle for skills, time periods, radius and budget.
 * `single` switches the ARIA semantics from checkbox to radio and uses the
 * solid primary fill; multi-select chips stay tinted so a fully selected
 * group does not become a wall of lime.
 */
export function SelectionChip({
  label,
  selected,
  single = false,
  onClick,
  className,
}: {
  label: string
  selected: boolean
  single?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      role={single ? 'radio' : undefined}
      aria-checked={single ? selected : undefined}
      aria-pressed={single ? undefined : selected}
      onClick={onClick}
      className={cn(
        'flex h-11 items-center justify-center rounded-full border px-4 text-label transition-colors active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        selected
          ? single
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-primary bg-primary/15 text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {label}
    </button>
  )
}

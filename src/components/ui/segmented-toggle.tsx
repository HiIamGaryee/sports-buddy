import { cn } from '@/lib/utils'

export interface SegmentedToggleOption<T extends string> {
  label: string
  value: T
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly SegmentedToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      className={cn('grid h-12 w-full grid-cols-[repeat(var(--segments),minmax(0,1fr))] rounded-full bg-muted p-1', className)}
      style={{ '--segments': options.length } as React.CSSProperties}
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-10 min-w-0 items-center justify-center rounded-full px-2 text-sm font-medium whitespace-nowrap transition-colors transition-shadow duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:text-base',
              isActive
                ? 'bg-primary-gradient text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

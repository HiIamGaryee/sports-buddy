import { Check } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * THE selection control. Skills, periods, radius, budget, sports, filters and
 * time suggestions were each drawing their own "selected" state; they now all
 * resolve to the same border/fill/typography here.
 *
 * `selection` changes the ARIA contract, not just the look:
 *   multiple — a checkbox, tinted and check-marked when on, so a fully
 *              selected group does not become a wall of lime
 *   single   — a radio, solid fill, because exactly one wins
 */
const choiceChipVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full border px-4 text-label transition-ui pressable focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      size: {
        default: 'h-11',
        sm: 'h-9 px-3',
      },
      selection: { multiple: '', single: '' },
      selected: { true: '', false: '' },
    },
    compoundVariants: [
      {
        selected: false,
        className:
          'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
      },
      {
        selected: true,
        selection: 'multiple',
        className: 'border-primary bg-primary/12 text-primary',
      },
      {
        selected: true,
        selection: 'single',
        className: 'border-primary bg-primary text-primary-foreground',
      },
    ],
    defaultVariants: {
      size: 'default',
      selection: 'multiple',
      selected: false,
    },
  },
)

export function ChoiceChip({
  label,
  selected = false,
  selection = 'multiple',
  size,
  disabled,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
} & VariantProps<typeof choiceChipVariants>) {
  const single = selection === 'single'

  return (
    <button
      type="button"
      role={single ? 'radio' : undefined}
      aria-checked={single ? Boolean(selected) : undefined}
      aria-pressed={single ? undefined : Boolean(selected)}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        choiceChipVariants({ selection, selected, size }),
        className,
      )}
    >
      {!single && selected && <Check aria-hidden />}
      {label}
    </button>
  )
}

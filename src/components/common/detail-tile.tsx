import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A read-only fact inside a card: icon, an uppercase label, the value.
 * The plan summary and the activity detail each had their own copy of this
 * row, and they had already drifted apart in icon colour and placeholder
 * wording before this replaced both.
 *
 * `as="dl"` keeps the activity detail a real description list — the semantics
 * change, the styling does not.
 */
export function DetailTile({
  icon: Icon,
  label,
  value,
  placeholder = 'Not decided yet',
  muted = false,
  trailing,
  as = 'div',
  className,
}: {
  icon: LucideIcon
  label: string
  value: string | null
  /** Shown when `value` is null, in muted type. */
  placeholder?: string
  /** Dims the icon — used while a value is proposed but not yet agreed. */
  muted?: boolean
  trailing?: React.ReactNode
  as?: 'div' | 'dl'
  className?: string
}) {
  const Root = as
  const Label = as === 'dl' ? 'dt' : 'span'
  const Value = as === 'dl' ? 'dd' : 'span'

  return (
    <Root
      className={cn(
        'flex items-start gap-3 rounded-xl bg-surface-subtle px-3 py-2.5',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0',
          muted ? 'text-muted-foreground' : 'text-primary',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="text-caption text-muted-foreground uppercase">
          {label}
        </Label>
        <Value
          className={cn(
            'text-title',
            value ? 'text-card-foreground' : 'text-muted-foreground',
          )}
        >
          {value ?? placeholder}
        </Value>
      </div>
      {trailing}
    </Root>
  )
}

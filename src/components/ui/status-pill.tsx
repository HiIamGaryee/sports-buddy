import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * THE status display. Before this, five surfaces each invented their own
 * status treatment (a `Badge`, a tinted paragraph, a bordered row, two
 * bare coloured spans), so "agreed" looked different in the plan, the chat
 * card and the activity.
 *
 * Tones are semantic, never literal colours, and the label always carries the
 * meaning in words — the tone only reinforces it, so the pill stays readable
 * to anyone who cannot separate lime from orange.
 */
const statusPillVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-label whitespace-nowrap transition-ui [&>svg]:size-3.5 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        /** No state yet: not started, not decided, not applicable. */
        neutral: 'bg-surface-subtle text-muted-foreground',
        /** In progress and waiting on someone. */
        pending: 'bg-warning/12 text-warning',
        /** Settled, agreed, confirmed. */
        success: 'bg-primary/12 text-primary',
        /** Live and moving — the current focus. */
        active: 'bg-secondary/12 text-secondary',
        /** Failed, cancelled, blocked. */
        danger: 'bg-destructive/12 text-destructive',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function StatusPill({
  icon: Icon,
  tone,
  className,
  children,
}: {
  icon?: LucideIcon
  className?: string
  children: React.ReactNode
} & VariantProps<typeof statusPillVariants>) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)}>
      {Icon && <Icon aria-hidden />}
      {children}
    </span>
  )
}

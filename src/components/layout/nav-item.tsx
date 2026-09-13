import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

/**
 * THE navigation item, shared by all three navigation shapes (phone bar,
 * tablet rail, desktop sidebar). They render the same `mainNavigation`
 * config, so they should not have owned three different copies of the active
 * state — which is exactly what had happened: the bar tinted only the text,
 * the rail and the sidebar tinted the background, and the three focus rings
 * were written out by hand.
 *
 * The active state is `aria-current="page"`, set by `NavLink` itself, so it is
 * announced as well as shown, and nested routes such as `/discover/:userId`
 * keep their parent destination active with no extra wiring.
 */
const navItemVariants = cva(
  'group flex items-center text-muted-foreground transition-ui aria-[current=page]:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
  {
    variants: {
      shape: {
        /** Phone bottom bar: an equal-width column, text under the icon. */
        bar: 'h-full flex-col justify-center gap-1 rounded-lg',
        /** Tablet rail: a compact stack with a tinted active pill. */
        rail: 'flex-col justify-center gap-1 rounded-xl py-2.5 hover:bg-surface-subtle hover:text-foreground aria-[current=page]:bg-primary/12',
        /** Desktop sidebar: a full-width row, icon beside the label. */
        sidebar:
          'gap-3 rounded-xl px-3 py-2.5 text-title hover:bg-surface-subtle hover:text-foreground aria-[current=page]:bg-primary/12',
      },
    },
    defaultVariants: { shape: 'bar' },
  },
)

export function NavItem({
  to,
  label,
  icon: Icon,
  shape,
  className,
  badgeCount = 0,
}: {
  to: string
  label: string
  icon: LucideIcon
  className?: string
  /**
   * Unread items behind this destination. A dot on the icon rather than a
   * number: the exact count is in the list itself, and the accessible name
   * says it in words so the badge is never colour alone.
   */
  badgeCount?: number
} & VariantProps<typeof navItemVariants>) {
  const hasBadge = badgeCount > 0

  return (
    <NavLink to={to} className={cn(navItemVariants({ shape }), className)}>
      <span className="relative shrink-0">
        <Icon
          aria-hidden
          className={cn(
            'shrink-0',
            shape === 'bar'
              ? 'size-6 transition-transform group-aria-[current=page]:scale-110'
              : 'size-5',
          )}
        />
        {hasBadge && (
          <span
            // `bg-background` ring so the dot stays legible on the tinted
            // active pill as well as the plain bar.
            className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </span>
      <span className={shape === 'sidebar' ? undefined : 'text-caption'}>
        {label}
      </span>
      {hasBadge && (
        <span className="sr-only">
          {badgeCount === 1 ? '1 unread' : `${badgeCount} unread`}
        </span>
      )}
    </NavLink>
  )
}

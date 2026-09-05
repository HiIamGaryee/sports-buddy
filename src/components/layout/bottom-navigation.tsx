import { NavLink } from 'react-router-dom'

import { mainNavigation } from '@/config/navigation'
import { cn } from '@/lib/utils'

/**
 * MOBILE navigation (<768px) only — `AppShell` renders a rail on tablet and a
 * sidebar on desktop instead. It is not rendered above `md` at all, rather
 * than being present and visually hidden.
 */
export function BottomNavigation({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/85 pb-safe-bottom shadow-floating backdrop-blur-xl',
        className,
      )}
    >
      <ul className="flex h-bottom-nav items-stretch px-1">
        {mainNavigation.map(({ label, path, icon: Icon }) => (
          <li key={path} className="flex-1">
            <NavLink
              to={path}
              className="group flex h-full flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground transition-colors aria-[current=page]:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon
                aria-hidden
                className="size-6 transition-transform group-aria-[current=page]:scale-110"
              />
              <span className="text-caption group-aria-[current=page]:text-primary">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

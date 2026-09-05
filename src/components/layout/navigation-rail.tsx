import { NavLink } from 'react-router-dom'

import { mainNavigation } from '@/config/navigation'
import { cn } from '@/lib/utils'

/**
 * TABLET navigation (768–1023px). A compact vertical rail — deliberately not
 * an enlarged bottom bar, and not a shrunken desktop sidebar: at 768px a
 * 240px sidebar would eat a third of the screen.
 *
 * Renders from the same `mainNavigation` config as the bottom bar and the
 * desktop sidebar; there is one navigation source of truth.
 */
export function NavigationRail({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'sticky top-0 h-dvh w-rail shrink-0 border-r border-border bg-surface pt-safe-top',
        className,
      )}
    >
      <ul className="flex flex-col items-center gap-1 py-4">
        {mainNavigation.map(({ label, path, icon: Icon }) => (
          <li key={path} className="w-full px-2">
            <NavLink
              to={path}
              className="group flex flex-col items-center gap-1 rounded-xl py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon aria-hidden className="size-5" />
              <span className="text-caption">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

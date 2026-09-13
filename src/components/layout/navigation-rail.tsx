import { NavItem } from '@/components/layout/nav-item'
import { mainNavigation } from '@/config/navigation'
import { cn } from '@/lib/utils'

import type { NavigationBadges } from '@/config/navigation'

/**
 * TABLET navigation (768–1023px). A compact vertical rail — deliberately not
 * an enlarged bottom bar, and not a shrunken desktop sidebar: at 768px a
 * 240px sidebar would eat a third of the screen.
 *
 * Renders from the same `mainNavigation` config as the bottom bar and the
 * desktop sidebar; there is one navigation source of truth.
 */
export function NavigationRail({
  className,
  badges = {},
}: {
  className?: string
  badges?: NavigationBadges
}) {
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
            <NavItem
              shape="rail"
              to={path}
              label={label}
              icon={Icon}
              badgeCount={badges[path]}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}

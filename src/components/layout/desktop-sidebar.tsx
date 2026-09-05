import { Settings } from 'lucide-react'

import { NavItem } from '@/components/layout/nav-item'
import { mainNavigation } from '@/config/navigation'
import { APP_NAME } from '@/constants/app'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routes'

/**
 * DESKTOP navigation (≥1024px). Brand, the five main destinations, then
 * Settings pinned to the bottom — the same `mainNavigation` config the phone
 * and tablet chrome render.
 *
 * `NavLink` matches by path prefix, so `/discover/:userId`,
 * `/messages/:conversationId` and `/profile/edit` keep their parent tab
 * active without any extra wiring.
 */
export function DesktopSidebar({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'sticky top-0 flex h-dvh w-sidebar shrink-0 flex-col border-r border-border bg-surface px-3 pt-safe-top pb-4',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-6">
        <span aria-hidden className="size-3 rounded-full bg-primary-gradient" />
        <span className="text-heading-3 text-primary-gradient">{APP_NAME}</span>
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        {mainNavigation.map(({ label, path, icon: Icon }) => (
          <li key={path}>
            <NavItem shape="sidebar" to={path} label={label} icon={Icon} />
          </li>
        ))}
      </ul>

      <NavItem
        shape="sidebar"
        to={ROUTES.settings}
        label="Settings"
        icon={Settings}
      />
    </nav>
  )
}

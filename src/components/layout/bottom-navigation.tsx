import { NavItem } from '@/components/layout/nav-item'
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
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-overlay pb-safe-bottom shadow-floating backdrop-blur-xl',
        className,
      )}
    >
      <ul className="flex h-bottom-nav items-stretch px-1">
        {mainNavigation.map(({ label, path, icon: Icon }) => (
          <li key={path} className="flex-1">
            <NavItem shape="bar" to={path} label={label} icon={Icon} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { NavLink } from 'react-router-dom'

import { mainNavigation } from '@/config/navigation'

export function BottomNavigation() {
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-content -translate-x-1/2 border-t border-border bg-surface/85 pb-safe-bottom shadow-floating backdrop-blur-xl"
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

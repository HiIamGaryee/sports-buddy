import { Menu } from 'lucide-react'

import logo from '@/assets/logo.png'
import settingsIcon from '@/assets/svg/settings-svgrepo-com.svg'
import { NavItem } from '@/components/layout/nav-item'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { mainNavigation } from '@/config/navigation'
import { ROUTES } from '@/routes/routes'

/** Phone-only overflow navigation, opened from the persistent app header. */
export function MobileNavigationMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-ui hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[min(18rem,86vw)] gap-0 border-border bg-surface p-0 pt-safe-top"
      >
        <div className="flex h-18 items-center border-b border-border px-5 pr-14">
          <img
            src={logo}
            alt="Sports Buddy"
            className="max-h-10 max-w-37.5 object-contain object-left"
          />
        </div>

        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col p-3">
          <ul className="flex flex-col gap-1">
            {mainNavigation.map(({ label, path, icon }) => (
              <li key={path}>
                <SheetClose asChild>
                  <NavItem shape="sidebar" to={path} label={label} icon={icon} />
                </SheetClose>
              </li>
            ))}
          </ul>

          <div className="mt-auto border-t border-border pt-3">
            <SheetClose asChild>
              <NavItem
                shape="sidebar"
                to={ROUTES.settings}
                label="Settings"
                icon={settingsIcon}
              />
            </SheetClose>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

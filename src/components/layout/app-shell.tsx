import { Outlet, useMatch } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/bottom-navigation'
import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import { NavigationRail } from '@/components/layout/navigation-rail'
import { ROUTES } from '@/routes/routes'

/**
 * The signed-in app frame, and the ONLY place that decides which navigation
 * chrome exists at a given width:
 *
 *   < 768px   bottom navigation, document scrolls
 *   ≥ 768px   compact navigation rail, content column scrolls
 *   ≥ 1024px  full sidebar, content column scrolls
 *
 * The variants are rendered conditionally by breakpoint rather than all being
 * mounted and hidden, and pages never know which one is active — they compose
 * `AppHeader` + `PageContainer` exactly as before.
 *
 * From `md` up the content column owns the scrolling (`h-dvh` +
 * `overflow-y-auto`), so the sidebar stays put without any page needing a
 * margin, and page-level sticky headers stick to the column.
 *
 * The single piece of route awareness here is the mobile chat screen: a
 * conversation needs the full viewport for its own composer, so the bottom
 * bar is not rendered there (it is absent on tablet and desktop anyway).
 */
export function AppShell() {
  const isConversation = useMatch(ROUTES.conversation) !== null

  return (
    <div className="flex min-h-dvh bg-background pl-safe-left pr-safe-right md:h-dvh md:overflow-hidden">
      <NavigationRail className="hidden md:flex lg:hidden" />
      <DesktopSidebar className="hidden lg:flex" />

      <div className="flex min-w-0 flex-1 flex-col md:h-dvh md:overflow-y-auto">
        <Outlet />
      </div>

      {!isConversation && <BottomNavigation className="md:hidden" />}
    </div>
  )
}

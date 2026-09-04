import { Outlet } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/bottom-navigation'

/**
 * Mobile app shell: centres the phone-width experience on large screens,
 * handles horizontal safe areas and hosts the fixed bottom navigation.
 * Pages compose their own <AppHeader> + <PageContainer>.
 */
export function AppShell() {
  return (
    <div className="flex min-h-dvh justify-center bg-background pl-safe-left pr-safe-right">
      <div className="flex w-full max-w-content flex-col border-border sm:border-x">
        <Outlet />
      </div>
      <BottomNavigation />
    </div>
  )
}

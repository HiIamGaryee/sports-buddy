import { Outlet } from 'react-router-dom'

import { APP_NAME } from '@/constants/app'

/** Auth screens: same mobile column, no bottom navigation. */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh justify-center bg-background pl-safe-left pr-safe-right">
      <div className="flex w-full max-w-content flex-col border-border px-page pt-safe-top pb-safe-bottom sm:border-x">
        <header className="flex items-center gap-2 py-6">
          <span className="size-2.5 rounded-full bg-primary" />
          <span className="text-label text-foreground">{APP_NAME}</span>
        </header>
        <main className="flex flex-1 flex-col justify-center pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

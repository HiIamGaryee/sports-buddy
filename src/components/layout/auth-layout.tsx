import { Outlet } from 'react-router-dom'

import { APP_NAME, APP_TAGLINE_LINES } from '@/constants/app'

/**
 * Auth screens. A phone gets the familiar single column; from `lg` the screen
 * splits into a brand panel and the form, so a 1440px sign-in is not a narrow
 * phone card floating in empty space.
 *
 * The form itself stays at `max-w-narrow` at every width — a stretched input
 * is harder to read, not more impressive.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh bg-background pl-safe-left pr-safe-right">
      <aside className="hidden flex-1 flex-col justify-between border-r border-border bg-surface px-gutter py-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="size-3 rounded-full bg-primary-gradient" />
          <span className="text-heading-3 text-primary-gradient">
            {APP_NAME}
          </span>
        </div>
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-display text-foreground">
            {APP_TAGLINE_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <p className="text-body text-muted-foreground">
            Find people who play the sports you play, at the times you're free,
            near where you already are.
          </p>
        </div>
        <span className="text-caption text-muted-foreground uppercase">
          Your exact location is never shared
        </span>
      </aside>

      <div className="flex flex-1 flex-col px-gutter pt-safe-top pb-safe-bottom">
        <header className="flex items-center gap-2 py-6 lg:hidden">
          <span aria-hidden className="size-2.5 rounded-full bg-primary-gradient" />
          <span className="text-label text-foreground">{APP_NAME}</span>
        </header>
        <main className="mx-auto flex w-full max-w-narrow flex-1 flex-col justify-center pb-10 lg:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

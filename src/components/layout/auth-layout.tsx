import { Outlet, useLocation } from 'react-router-dom'

import loginBackground from '@/assets/img-bg-v1.jpeg'
import logo from '@/assets/logo.png'
import registerBackground from '@/assets/img-bg-v2.webp'
import { APP_TAGLINE_LINES } from '@/constants/app'
import { ROUTES } from '@/routes/routes'

/**
 * Auth screens. A phone gets the familiar single column; from `lg` the screen
 * splits into a brand panel and the form, so a 1440px sign-in is not a narrow
 * phone card floating in empty space.
 *
 * The form itself stays at `max-w-narrow` at every width — a stretched input
 * is harder to read, not more impressive.
 */
export function AuthLayout() {
  const { pathname } = useLocation()
  const backgroundImage =
    pathname === ROUTES.register ? registerBackground : loginBackground

  return (
    <div className="relative isolate flex min-h-dvh overflow-x-hidden bg-transparent pl-safe-left pr-safe-right">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <aside className="hidden flex-1 flex-col justify-center gap-10 border-r border-border bg-background/35 px-gutter py-10 backdrop-blur-sm lg:flex">
        <div className="flex max-w-md flex-col gap-4">
          <div className="flex items-start gap-4">
            <img
              src={logo}
              alt="Sports Buddy"
              className="mt-1 size-14 shrink-0 object-contain"
            />
            <p className="text-display text-foreground">
              {APP_TAGLINE_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
          <p className="text-body text-muted-foreground">
            Find people who play the sports you play, at the times you're free,
            near where you already are.
          </p>
        </div>
        <span className="text-caption text-muted-foreground uppercase">
          Your exact location is never shared
        </span>
      </aside>

      <div className="flex flex-1 flex-col bg-background/70 px-gutter pt-safe-top pb-safe-bottom backdrop-blur-xl lg:bg-background/82">
        <header className="flex items-center gap-2.5 py-6 lg:hidden">
          <img src={logo} alt="Sports Buddy" className="size-8 object-contain" />
        </header>
        <main className="mx-auto flex w-full max-w-narrow flex-1 flex-col justify-center py-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

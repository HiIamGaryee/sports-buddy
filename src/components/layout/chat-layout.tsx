import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/initials'
import { ROUTES } from '@/routes/routes'

/**
 * Full-screen chat shell: compact header, a scroll region that takes the
 * remaining height, and a composer pinned above the home indicator.
 *
 * This route sits inside `ProtectedRoute` but OUTSIDE `AppShell`, so the
 * bottom navigation is hidden and the composer never fights the tab bar —
 * the same reasoning as the edit screens. `h-dvh` (not `100vh`) keeps the
 * layout correct when a mobile keyboard resizes the viewport, which also
 * matters inside a Capacitor WebView.
 */
export function ChatLayout({
  title,
  subtitle,
  photoUrl,
  scrollRef,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  photoUrl?: string | null
  scrollRef?: React.Ref<HTMLDivElement>
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <div className="flex h-dvh justify-center bg-background pl-safe-left pr-safe-right">
      <div className="flex w-full max-w-content flex-col border-border sm:border-x">
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/85 px-page pt-safe-top pb-3 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to messages"
            onClick={() => navigate(ROUTES.messages)}
            className="-ml-2 shrink-0"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Avatar className="size-9 shrink-0">
            {photoUrl && <AvatarImage src={photoUrl} alt={title} />}
            <AvatarFallback className="text-label">
              {getInitials(title)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-title text-foreground">{title}</h1>
            {subtitle && (
              <p className="truncate text-caption text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-page py-4"
        >
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-border bg-background px-page pt-3 pb-safe-bottom">
            {footer}
            <span className="block h-3" />
          </footer>
        )}
      </div>
    </div>
  )
}

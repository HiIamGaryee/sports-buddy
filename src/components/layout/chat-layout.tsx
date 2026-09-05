import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/initials'
import { ROUTES } from '@/routes/routes'

/**
 * The conversation pane: compact header, a scroll region that takes the
 * remaining height, and a composer pinned to the bottom.
 *
 * On a phone it fills the viewport (`h-dvh`) and `AppShell` drops the bottom
 * navigation, so the composer owns the bottom safe area. From `md` up it
 * fills the detail pane of the messages workspace instead (`md:h-full`), and
 * the back button disappears because the conversation list is already on
 * screen.
 *
 * `h-dvh` rather than `100vh` keeps a mobile keyboard shrinking the message
 * area instead of pushing the composer off-screen — which also matters inside
 * a Capacitor WebView.
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
    <div className="flex h-dvh min-h-0 w-full flex-col bg-background md:h-full">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/85 px-gutter pt-safe-top pb-3 backdrop-blur-xl md:pt-4">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to messages"
          onClick={() => navigate(ROUTES.messages)}
          className="-ml-2 shrink-0 md:hidden"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Avatar className="size-9 shrink-0 md:size-10">
          {photoUrl && <AvatarImage src={photoUrl} alt={title} />}
          <AvatarFallback className="text-label">
            {getInitials(title)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-title text-foreground md:text-heading-3">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-caption text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-gutter">
        {/* Messages stay in a readable column however wide the pane gets. */}
        <div className="mx-auto flex w-full max-w-default flex-col gap-3 py-4">
          {children}
        </div>
      </div>

      {footer && (
        <footer className="shrink-0 border-t border-border bg-background px-gutter pt-3 pb-safe-bottom md:pb-4">
          <div className="mx-auto w-full max-w-default">{footer}</div>
          <span className="block h-3 md:hidden" />
        </footer>
      )}
    </div>
  )
}

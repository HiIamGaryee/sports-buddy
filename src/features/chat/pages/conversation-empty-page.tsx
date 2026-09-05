import { MessageCircle } from 'lucide-react'

/**
 * The detail pane at `/messages` on tablet and desktop. On a phone this route
 * shows the list instead, so this is never the whole screen.
 */
export function ConversationEmptyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-gutter text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MessageCircle aria-hidden className="size-6" />
      </span>
      <p className="text-title text-foreground">
        Select a sports buddy to start chatting.
      </p>
      <p className="max-w-xs text-body-small text-muted-foreground">
        Your connected buddies are on the left. Pick one and plan something.
      </p>
    </div>
  )
}

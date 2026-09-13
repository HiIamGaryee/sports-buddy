import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { formatMessageTime } from '@/lib/chat-format'
import { splitActivityLinks } from '@/lib/share'
import { cn } from '@/lib/utils'
import { activityPostPath } from '@/routes/routes'
import { shareService } from '@/services/share/share-service'
import type { ChatMessage } from '@/types/chat'

/**
 * One immutable text event. Content is rendered as text children, so React
 * escapes it — user messages never go anywhere near `dangerouslySetInnerHTML`.
 *
 * The ONE transformation: a link to an activity on our own origin becomes an
 * in-app link to that activity (the route is built from the validated post
 * id, never from the text). Every other URL stays plain, unclickable text.
 */
export function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessage
  isOwn: boolean
}) {
  const time = formatMessageTime(message.createdAt)
  const parts = useMemo(
    () => splitActivityLinks(message.content, shareService.trustedOrigins()),
    [message.content],
  )

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          // A percentage on a phone, a hard readable cap on a wide pane —
          // one short message must never stretch across a desktop screen.
          'flex max-w-[80%] min-w-0 flex-col gap-1 rounded-2xl px-3.5 py-2.5 md:max-w-[70%] lg:max-w-md',
          isOwn
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border bg-card text-card-foreground',
        )}
      >
        <p className="text-body wrap-anywhere whitespace-pre-wrap">
          {parts.map((part, index) =>
            part.kind === 'activity' ? (
              <Link
                key={index}
                to={activityPostPath(part.postId)}
                className="font-medium underline underline-offset-4"
              >
                View activity
              </Link>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </p>
        <span
          className={cn(
            'self-end text-caption',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {time || 'Sending…'}
        </span>
      </div>
    </div>
  )
}

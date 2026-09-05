import { formatMessageTime } from '@/lib/chat-format'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/chat'

/**
 * One immutable text event. Content is rendered as a text child, so React
 * escapes it — user messages never go anywhere near `dangerouslySetInnerHTML`,
 * and there is no link or preview transformation.
 */
export function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessage
  isOwn: boolean
}) {
  const time = formatMessageTime(message.createdAt)

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex max-w-[80%] min-w-0 flex-col gap-1 rounded-2xl px-3.5 py-2.5',
          isOwn
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border bg-card text-card-foreground',
        )}
      >
        <p className="text-body wrap-anywhere whitespace-pre-wrap">
          {message.content}
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

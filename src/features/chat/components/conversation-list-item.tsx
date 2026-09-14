import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/initials'
import { formatConversationTime } from '@/lib/chat-format'
import { cn } from '@/lib/utils'
import { conversationPath } from '@/routes/routes'
import type { ConversationListItem as ConversationRow } from '@/features/chat/use-conversations'

/**
 * A connected buddy, with their thread if one exists.
 *
 * The unread dot is REAL: it is derived from the viewer's own read marker
 * (`src/lib/chat-read-state.ts`) against the conversation's last message, and
 * clears the moment the thread is opened. Still no "seen" and no presence —
 * those would need the other person's state, which is not tracked, and a fake
 * one is worse than none.
 */
export function ConversationListItem({
  item,
  isSelected = false,
}: {
  item: ConversationRow
  /** Only meaningful in the tablet/desktop workspace, where both panes show. */
  isSelected?: boolean
}) {
  const time = formatConversationTime(item.lastMessageAt)
  const preview = item.lastMessageText
    ? `${item.isOwnLastMessage ? 'You: ' : ''}${item.lastMessageText}`
    : 'Start a conversation'

  return (
    <Link
      to={conversationPath(item.conversationId)}
      aria-current={isSelected ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 p-4 transition-ui hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:rounded-xl md:px-3',
        isSelected && 'md:bg-muted',
      )}
    >
      <Avatar className="size-11 shrink-0">
        {item.photoUrl && (
          <AvatarImage src={item.photoUrl} alt={item.displayName} />
        )}
        <AvatarFallback className="text-title">
          {getInitials(item.displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'truncate text-title text-card-foreground',
            item.isUnread && 'font-semibold',
          )}
        >
          {item.displayName}
        </span>
        <span
          className={cn(
            'truncate text-body-small',
            item.lastMessageText ? 'text-muted-foreground' : 'text-primary',
            // Unread is never colour alone: the preview gains weight and
            // full-strength text, and the dot below carries a real label.
            item.isUnread && 'font-medium text-card-foreground',
          )}
        >
          {preview}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {time && (
          <span
            className={cn(
              'text-caption',
              item.isUnread ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {time}
          </span>
        )}
        {item.isUnread ? (
          <span
            role="status"
            aria-label={`Unread message from ${item.displayName}`}
            className="size-2.5 rounded-full bg-primary"
          />
        ) : (
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        )}
      </div>
    </Link>
  )
}

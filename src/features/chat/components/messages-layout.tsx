import { Outlet, useMatch } from 'react-router-dom'

import { MessagesListPane } from '@/features/chat/components/messages-list-pane'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routes'

/**
 * The Messages workspace, and the one place the phone flow and the
 * tablet/desktop flow differ.
 *
 *   < 768px   one pane at a time: the list, or the conversation
 *   ≥ 768px   master–detail: the list stays beside the conversation
 *
 * Both breakpoints use the SAME routes, so `/messages/:conversationId` is a
 * working deep link everywhere — on desktop it simply renders the list
 * alongside the selected conversation instead of replacing it.
 *
 * The list pane stays mounted while a conversation is open, so returning to
 * it is instant and the single conversations subscription is not torn down
 * and recreated on every navigation.
 */
export function MessagesLayout() {
  const match = useMatch(ROUTES.conversation)
  const selectedId = match?.params.conversationId ?? null

  return (
    <div className="flex min-h-0 flex-1 md:h-full">
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col md:w-conversations md:flex-none md:border-r md:border-border',
          selectedId && 'max-md:hidden',
        )}
      >
        <MessagesListPane selectedId={selectedId} />
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 flex-col md:flex',
          selectedId ? 'flex' : 'hidden',
        )}
      >
        <Outlet />
      </div>
    </div>
  )
}

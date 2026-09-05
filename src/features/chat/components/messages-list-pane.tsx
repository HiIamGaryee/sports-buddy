import { MessageCircle, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationListItem } from '@/features/chat/components/conversation-list-item'
import { useConversations } from '@/features/chat/use-conversations'
import { ROUTES } from '@/routes/routes'

const SKELETON_ROWS = [0, 1, 2]

/**
 * The Messages list. It is a full page on a phone and the left pane of the
 * workspace from `md` up, so it scrolls inside itself rather than assuming it
 * owns the viewport.
 *
 * Rows come from the CONNECTED buddy list, so a buddy who has never been
 * messaged still appears. Pending connections are absent by construction.
 */
export function MessagesListPane({ selectedId }: { selectedId?: string | null }) {
  const { items, isLoading, error } = useConversations()

  return (
    <>
      <AppHeader
        title="Messages"
        subtitle="Your connected sports buddies."
        size="full"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-gutter pt-5 pb-bottom-nav-space md:gap-5 md:px-3 md:pt-3 md:pb-4">
        {isLoading && (
          <Card className="py-0 md:border-0 md:bg-transparent md:shadow-none">
            {SKELETON_ROWS.map((key) => (
              <div key={key}>
                {key > 0 && <Separator className="md:hidden" />}
                <div className="flex items-center gap-3 p-4 md:px-3">
                  <Skeleton className="size-11 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full max-w-40" />
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {!isLoading && error && (
          <EmptyState
            icon={MessageCircle}
            title={error}
            description="Something went wrong on our side, not yours."
          />
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col gap-4">
            <EmptyState
              icon={Users}
              title="No sports buddies yet."
              description="Connect with someone in Discover and your conversations show up here."
            />
            <Button size="lg" variant="outline" asChild>
              <Link to={ROUTES.discover}>Find a Buddy</Link>
            </Button>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          // A card on a phone; on the workspace pane the divider IS the pane
          // border, so the extra frame is dropped.
          <Card className="overflow-hidden py-0 md:rounded-none md:border-0 md:bg-transparent md:shadow-none">
            {items.map((item, index) => (
              <div key={item.conversationId}>
                {index > 0 && <Separator className="md:hidden" />}
                <ConversationListItem
                  item={item}
                  isSelected={item.conversationId === selectedId}
                />
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  )
}

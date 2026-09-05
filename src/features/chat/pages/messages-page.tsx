import { MessageCircle, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationListItem } from '@/features/chat/components/conversation-list-item'
import { useConversations } from '@/features/chat/use-conversations'
import { ROUTES } from '@/routes/routes'

const SKELETON_ROWS = [0, 1, 2]

/**
 * The Messages list is the list of CONNECTED buddies, so a buddy you have
 * never messaged is still reachable. Pending connections are absent by
 * construction — chat requires a mutual connection.
 */
export function MessagesPage() {
  const { items, isLoading, error } = useConversations()

  return (
    <>
      <AppHeader
        title="Messages"
        subtitle="Your connected sports buddies."
      />
      <PageContainer>
        {isLoading && (
          <Card className="py-0">
            {SKELETON_ROWS.map((key) => (
              <div key={key}>
                {key > 0 && <Separator />}
                <div className="flex items-center gap-3 p-4">
                  <Skeleton className="size-11 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
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
          <Card className="overflow-hidden py-0">
            {items.map((item, index) => (
              <div key={item.conversationId}>
                {index > 0 && <Separator />}
                <ConversationListItem item={item} />
              </div>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  )
}

import { Link, useParams } from 'react-router-dom'
import { ArrowDown } from 'lucide-react'

import { ErrorState } from '@/components/common/error-state'
import { isValidPairId } from '@/lib/ids'
import { ChatLayout } from '@/components/layout/chat-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DateSeparator } from '@/features/chat/components/date-separator'
import { MessageBubble } from '@/features/chat/components/message-bubble'
import { MessageComposer } from '@/features/chat/components/message-composer'
import { useChatScroll } from '@/features/chat/use-chat-scroll'
import { useConversation } from '@/features/chat/use-conversation'
import { SafetyActions } from '@/components/safety/safety-actions'
import { useNavigate } from 'react-router-dom'
import { formatDateSeparator, isSameDay } from '@/lib/chat-format'
import { ROUTES } from '@/routes/routes'

const SKELETON_BUBBLES = [
  { key: 0, own: false, width: 'w-40' },
  { key: 1, own: true, width: 'w-28' },
  { key: 2, own: false, width: 'w-52' },
] as const

export function ConversationPage() {
  const navigate = useNavigate()
  const { conversationId: rawConversationId } =
    useParams<{ conversationId: string }>()
  // A route param is untrusted input on its way to `doc(db, COLLECTION, id)`.
  // An invalid id becomes `undefined`, which the hook already treats as
  // "nothing to load", so the page shows its normal unavailable state instead
  // of building a malformed document path.
  // A conversation id IS the STEP 8 pair id, so the shape is checkable.
  const conversationId = isValidPairId(rawConversationId)
    ? rawConversationId
    : undefined
  const conversation = useConversation(conversationId)
  const {
    currentUserId,
    buddyName,
    buddyPhotoUrl,
    isAuthorized,
    isResolvingAccess,
    messages,
    hasMore,
    isLoading,
    error,
    isLoadingOlder,
    isSending,
    sendError,
    loadOlder,
    sendMessage,
    retry,
  } = conversation

  const { scrollRef, hasNewMessages, scrollToBottom, preserveScroll } =
    useChatScroll(messages, currentUserId)
  // Nothing is requested until access is resolved, so an unauthorized route
  // can never flash someone else's messages. The placeholder fills the pane
  // rather than taking over the screen, because on desktop this is one
  // column of the messages workspace.
  if (isResolvingAccess) {
    return (
      <ChatLayout title="Conversation">
        <div className="flex flex-1 items-center justify-center">
          <span className="text-body-small text-muted-foreground">
            Opening conversation…
          </span>
        </div>
      </ChatLayout>
    )
  }

  if (!isAuthorized) {
    // Deliberately generic: it must not reveal whether the conversation exists.
    return (
      <ChatLayout title="Conversation">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-title text-foreground">
            This conversation is unavailable.
          </p>
          <p className="max-w-xs text-body-small text-muted-foreground">
            You can message a sports buddy once you're both connected.
          </p>
          <Button variant="outline" asChild>
            <Link to={ROUTES.messages}>Back to Messages</Link>
          </Button>
        </div>
      </ChatLayout>
    )
  }

  const loadEarlier = () => {
    preserveScroll()
    void loadOlder()
  }

  return (
    <ChatLayout
      title={buddyName}
      photoUrl={buddyPhotoUrl}
      action={
        conversation.buddyId && conversationId ? (
          <SafetyActions
            targetUserId={conversation.buddyId}
            displayName={buddyName}
            context={{ type: 'conversation', conversationId }}
            onBlocked={() => navigate(ROUTES.messages)}
          />
        ) : undefined
      }
      scrollRef={scrollRef}
      footer={
        <MessageComposer
          buddyName={buddyName}
          isSending={isSending}
          error={sendError}
          onSend={sendMessage}
        />
      }
    >
      {isLoading ? (
        SKELETON_BUBBLES.map(({ key, own, width }) => (
          <div key={key} className={own ? 'flex justify-end' : 'flex'}>
            <Skeleton className={`h-12 rounded-2xl ${width}`} />
          </div>
        ))
      ) : error ? (
        <ErrorState title={error} onRetry={retry} className="my-auto" />
      ) : (
        <>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadEarlier}
              disabled={isLoadingOlder}
              className="self-center"
            >
              {isLoadingOlder ? 'Loading…' : 'Load earlier messages'}
            </Button>
          )}

          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-title text-foreground">
                Start the conversation.
              </p>
              <p className="max-w-xs text-body-small text-muted-foreground">
                You connected over sport. Time to plan something.
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const startsDay =
              !previous || !isSameDay(previous.createdAt, message.createdAt)

            return (
              <div key={message.id} className="flex flex-col gap-3">
                {startsDay && (
                  <DateSeparator label={formatDateSeparator(message.createdAt)} />
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === currentUserId}
                />
              </div>
            )
          })}
        </>
      )}

      {hasNewMessages && (
        <Button
          size="sm"
          onClick={() => scrollToBottom()}
          className="sticky bottom-0 self-center rounded-full shadow-md"
        >
          <ArrowDown className="size-4" />
          New message
        </Button>
      )}
    </ChatLayout>
  )
}

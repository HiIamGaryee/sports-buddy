import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { useSafety } from '@/hooks/use-safety'
import { canChat, mergeMessages } from '@/lib/chat'
import { getOtherParticipantId } from '@/lib/connection'
import { chatService } from '@/services/chat/chat-service'
import { discoverService } from '@/services/discover/discover-service'
import type { ChatMessage } from '@/types/chat'

interface MessagesState {
  key: string
  messages: ChatMessage[]
  hasMore: boolean
  isLoading: boolean
  error: string
}

const loadingState = (key: string): MessagesState => ({
  key,
  messages: [],
  hasMore: false,
  isLoading: true,
  error: '',
})

/**
 * One open conversation. Messages are deliberately NOT held in a global
 * provider: they belong to the screen that is showing them, so nothing loads
 * a whole app's worth of history at startup.
 *
 * Authorization is resolved before any message request goes out, from the
 * connection state the provider already has — so an unauthorized route never
 * flashes someone else's messages.
 */
export function useConversation(conversationId: string | undefined) {
  const { user } = useAuth()
  const { connections, isLoading: isLoadingConnections } = useConnections()
  const userId = user?.id ?? null
  const { blockedIds, isLoading: isLoadingSafety } = useSafety()

  // The conversation id IS the connection id, so this is a lookup, not a read.
  const connection = useMemo(
    () =>
      conversationId
        ? ([...connections.values()].find(
            (entry) => entry.id === conversationId,
          ) ?? null)
        : null,
    [connections, conversationId],
  )

  const buddyId = useMemo(
    () =>
      connection && userId ? getOtherParticipantId(connection, userId) : null,
    [connection, userId],
  )
  const isAuthorized = userId !== null && canChat(connection, userId) && buddyId !== null && !blockedIds.has(buddyId)

  const requestKey = `${conversationId ?? ''}#${userId ?? ''}`
  const [state, setState] = useState<MessagesState>(() =>
    loadingState(requestKey),
  )
  // Reset during render when the route or user changes — no effect needed.
  if (state.key !== requestKey) setState(loadingState(requestKey))

  // `hasMore` comes from the first realtime page, then only from pagination:
  // later realtime emissions must not undo what the user has loaded.
  const hasReceivedFirstPage = useRef(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    hasReceivedFirstPage.current = false
  }, [requestKey])

  useEffect(() => {
    if (!conversationId || !userId || !isAuthorized) return

    let active = true
    let unsubscribe: (() => void) | undefined

    // Lazy creation: the document appears the first time the chat is opened.
    chatService
      .openConversation(connection, userId)
      .then(() => {
        if (!active) return
        unsubscribe = chatService.subscribeToRecentMessages(
          conversationId,
          (page) => {
            if (!active) return
            setState((current) => {
              const isFirst = !hasReceivedFirstPage.current
              hasReceivedFirstPage.current = true
              return {
                key: requestKey,
                messages: mergeMessages(current.messages, page.messages),
                hasMore: isFirst ? page.hasMore : current.hasMore,
                isLoading: false,
                error: '',
              }
            })
          },
          (subscriptionError) => {
            if (!active) return
            setState((current) => ({
              ...current,
              isLoading: false,
              error: subscriptionError.message,
            }))
          },
        )
      })
      .catch((openError: unknown) => {
        if (!active) return
        setState((current) => ({
          ...current,
          isLoading: false,
          error:
            openError instanceof Error
              ? openError.message
              : "We couldn't load this conversation.",
        }))
      })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [conversationId, userId, isAuthorized, connection, requestKey])

  // One read for the chat header — from publicProfiles, never `users/{uid}`.
  const [buddy, setBuddy] = useState<{
    displayName: string
    photoUrl: string | null
  } | null>(null)

  useEffect(() => {
    if (!buddyId) return

    let active = true
    discoverService
      .getCandidate(buddyId)
      .then((profile) => {
        if (active && profile) {
          setBuddy({
            displayName: profile.displayName,
            photoUrl: profile.photoUrl,
          })
        }
      })
      .catch(() => {
        // A missing projection just means initials and a generic name.
      })

    return () => {
      active = false
    }
  }, [buddyId])

  const loadOlder = useCallback(async () => {
    const oldest = state.messages[0]
    if (!conversationId || !oldest || isLoadingOlder) return

    setIsLoadingOlder(true)
    try {
      const page = await chatService.loadOlderMessages(
        conversationId,
        oldest.id,
      )
      setState((current) => ({
        ...current,
        messages: mergeMessages(current.messages, page.messages),
        hasMore: page.hasMore,
      }))
    } catch (loadError) {
      setState((current) => ({
        ...current,
        error:
          loadError instanceof Error
            ? loadError.message
            : "We couldn't load these messages.",
      }))
    } finally {
      setIsLoadingOlder(false)
    }
  }, [conversationId, state.messages, isLoadingOlder])

  /**
   * Resolves `true` only once the write is confirmed, so the composer keeps
   * the user's text on failure. No optimistic message is inserted.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || isSending) return false

      setIsSending(true)
      setSendError('')
      try {
        await chatService.sendMessage(connection, userId, content)
        return true
      } catch (error) {
        setSendError(
          error instanceof Error
            ? error.message
            : "Message wasn't sent. Try again.",
        )
        return false
      } finally {
        setIsSending(false)
      }
    },
    [connection, userId, isSending],
  )

  const retry = useCallback(() => {
    hasReceivedFirstPage.current = false
    setState(loadingState(requestKey))
  }, [requestKey])

  return {
    currentUserId: userId,
    buddyId,
    buddyName: buddy?.displayName ?? 'Sports buddy',
    buddyPhotoUrl: buddy?.photoUrl ?? null,
    /** False for a missing, pending or someone else's conversation alike. */
    isAuthorized,
    isResolvingAccess: isLoadingConnections || isLoadingSafety,
    messages: state.messages,
    hasMore: state.hasMore,
    isLoading: state.isLoading,
    error: state.error,
    isLoadingOlder,
    isSending,
    sendError,
    loadOlder,
    sendMessage,
    retry,
  }
}

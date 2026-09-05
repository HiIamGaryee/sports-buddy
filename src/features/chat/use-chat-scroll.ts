import { useCallback, useEffect, useRef, useState } from 'react'

import { SCROLL_BOTTOM_THRESHOLD_PX } from '@/constants/chat'
import type { ChatMessage } from '@/types/chat'

const distanceFromBottom = (element: HTMLElement) =>
  element.scrollHeight - element.scrollTop - element.clientHeight

/**
 * Chat scrolling, which is most of what makes a message list feel right:
 *
 * - opening a conversation lands on the newest message, with no animation
 * - sending always follows your own message down
 * - an incoming message only pulls you down if you were already at the bottom;
 *   if you are reading history it raises a "New message" button instead
 * - loading older messages keeps the message you were looking at in place
 */
export function useChatScroll(
  messages: readonly ChatMessage[],
  currentUserId: string | null,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [hasNewMessages, setHasNewMessages] = useState(false)

  const hasLanded = useRef(false)
  const lastNewestId = useRef<string | null>(null)
  // Distance from the bottom is invariant when items are PREPENDED, which is
  // what makes it the right thing to restore after loading history.
  const preservedDistance = useRef<number | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior })
    setHasNewMessages(false)
  }, [])

  /** Call immediately before requesting an older page. */
  const preserveScroll = useCallback(() => {
    const element = scrollRef.current
    if (element) preservedDistance.current = distanceFromBottom(element)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || messages.length === 0) return

    if (preservedDistance.current !== null) {
      element.scrollTop =
        element.scrollHeight - element.clientHeight - preservedDistance.current
      preservedDistance.current = null
      return
    }

    if (!hasLanded.current) {
      hasLanded.current = true
      lastNewestId.current = messages[messages.length - 1].id
      element.scrollTo({ top: element.scrollHeight })
      return
    }

    const newest = messages[messages.length - 1]
    if (newest.id === lastNewestId.current) return
    lastNewestId.current = newest.id

    if (
      newest.senderId === currentUserId ||
      distanceFromBottom(element) <= SCROLL_BOTTOM_THRESHOLD_PX
    ) {
      element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
      setHasNewMessages(false)
      return
    }

    setHasNewMessages(true)
  }, [messages, currentUserId])

  return { scrollRef, hasNewMessages, scrollToBottom, preserveScroll }
}

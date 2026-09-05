import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { getOtherParticipantId } from '@/lib/connection'
import { chatService } from '@/services/chat/chat-service'
import { discoverService } from '@/services/discover/discover-service'
import type { Conversation } from '@/types/chat'
import type { DiscoveryProfile } from '@/types/discovery-profile'

/** One row of the Messages list: a connected buddy, plus a thread if it exists. */
export interface ConversationListItem {
  /** Always the connection id, so the row links straight to the chat route. */
  conversationId: string
  buddyId: string
  displayName: string
  photoUrl: string | null
  lastMessageText: string | null
  lastMessageAt: string | null
  isOwnLastMessage: boolean
}

interface ProfilesState {
  key: string
  profiles: DiscoveryProfile[]
}

/** Stable identity, so the derived list does not invalidate memos each render. */
const NO_PROFILES: DiscoveryProfile[] = []

/**
 * The Messages list is built from the CONNECTION list, not from conversation
 * documents: a connected buddy you have never messaged still gets a row, and
 * a conversation only exists once someone actually opens the chat.
 *
 * Reads per open: one scoped conversation subscription plus ONE batched
 * `publicProfiles` query. Never a read per row, and never `users/{uid}`.
 */
export function useConversations() {
  const { user } = useAuth()
  const { connections, isLoading: isLoadingConnections } = useConnections()
  const userId = user?.id ?? null

  // Connected buddies, from state the connection provider already holds.
  const buddyIds = useMemo(
    () =>
      [...connections.values()]
        .filter((connection) => connection.status === 'connected')
        .flatMap((connection) => {
          const otherId = userId
            ? getOtherParticipantId(connection, userId)
            : null
          return otherId ? [otherId] : []
        })
        .sort(),
    [connections, userId],
  )

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return

    let active = true
    const unsubscribe = chatService.subscribeToConversations(
      userId,
      (loaded) => {
        if (active) setConversations(loaded)
      },
      (subscriptionError) => {
        if (active) setError(subscriptionError.message)
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [userId])

  // One batched query, re-run only when the set of connected buddies changes.
  const profilesKey = buddyIds.join(',')
  const [profileState, setProfileState] = useState<ProfilesState>({
    key: '',
    profiles: [],
  })

  // Derived during render, so a changed buddy set never shows stale names and
  // no state is set synchronously inside the effect.
  const isStale = profileState.key !== profilesKey
  const profiles = isStale ? NO_PROFILES : profileState.profiles
  const isLoadingProfiles = buddyIds.length > 0 && isStale

  useEffect(() => {
    if (buddyIds.length === 0) return

    let active = true
    discoverService
      .getProfiles(buddyIds)
      .then((loaded) => {
        if (active) setProfileState({ key: profilesKey, profiles: loaded })
      })
      .catch(() => {
        // A failed batch just means initials instead of names.
        if (active) setProfileState({ key: profilesKey, profiles: [] })
      })

    return () => {
      active = false
    }
    // `profilesKey` is the stable identity of `buddyIds`.
  }, [profilesKey, buddyIds])

  const items = useMemo<ConversationListItem[]>(() => {
    if (!userId) return []
    const byConversationId = new Map(
      conversations.map((conversation) => [conversation.id, conversation]),
    )
    const byBuddyId = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    )

    return [...connections.values()]
      .filter((connection) => connection.status === 'connected')
      .flatMap((connection) => {
        const buddyId = getOtherParticipantId(connection, userId)
        if (!buddyId) return []
        const conversation = byConversationId.get(connection.id)
        const profile = byBuddyId.get(buddyId)

        return [
          {
            conversationId: connection.id,
            buddyId,
            // A projection can be missing if the buddy turned discovery off.
            displayName: profile?.displayName ?? 'Sports buddy',
            photoUrl: profile?.photoUrl ?? null,
            lastMessageText: conversation?.lastMessageText ?? null,
            lastMessageAt: conversation?.lastMessageAt ?? null,
            isOwnLastMessage:
              conversation?.lastMessageSenderId === userId,
          },
        ]
      })
      .sort(compareRows)
  }, [connections, conversations, profiles, userId])

  return {
    items,
    isLoading: isLoadingConnections || isLoadingProfiles,
    error,
  }
}

/**
 * Active threads first, newest reply at the top; buddies with nothing said
 * yet follow, alphabetically. Fully deterministic — the list never reshuffles
 * between renders.
 */
function compareRows(a: ConversationListItem, b: ConversationListItem) {
  if (a.lastMessageAt && b.lastMessageAt) {
    return b.lastMessageAt.localeCompare(a.lastMessageAt)
  }
  if (a.lastMessageAt) return -1
  if (b.lastMessageAt) return 1
  return a.displayName.localeCompare(b.displayName)
}

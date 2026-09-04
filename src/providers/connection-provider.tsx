import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import {
  findNewMutualConnection,
  getConnectionState,
  toConnectionMap,
  toConnectionStates,
} from '@/lib/connection'
import { ConnectionContext } from '@/providers/connection-context'
import { connectionService } from '@/services/connection/connection-service'
import type { Connection, ConnectionState } from '@/types/connection'

interface ConnectionsState {
  userId: string | null
  connections: Connection[]
  isLoading: boolean
  error: string
  /** An event, not a state — see `justConnectedUserId` on the context. */
  justConnectedUserId: string | null
}

const initialState = (userId: string | null): ConnectionsState => ({
  userId,
  connections: [],
  isLoading: userId !== null,
  error: '',
  justConnectedUserId: null,
})

/**
 * The single source of truth for relationship state. Discover and the
 * candidate profile both read it, so they can never disagree about whether
 * someone is connected.
 *
 * Mounted inside `ProtectedRoute`, so no connection query ever runs on the
 * login, register or onboarding screens.
 */
export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ConnectionsState>(() =>
    initialState(userId),
  )

  // Reset during render when the signed-in user changes — no effect needed.
  if (state.userId !== userId) setState(initialState(userId))

  // The previous perspective per user, so "became connected" is detectable as
  // a transition. `null` until the first emission, so an already-connected
  // relationship on app open is never mistaken for a new one.
  const previousStates = useRef<ReadonlyMap<string, ConnectionState> | null>(
    null,
  )

  useEffect(() => {
    if (!userId) return

    previousStates.current = null
    let active = true

    // One realtime subscription, scoped to this user's own connections.
    const unsubscribe = connectionService.subscribe(
      userId,
      (loaded) => {
        if (!active) return

        const states = toConnectionStates(loaded, userId)
        const becameConnected = findNewMutualConnection(
          previousStates.current,
          states,
        )
        previousStates.current = states

        setState((current) => ({
          userId,
          connections: loaded,
          isLoading: false,
          error: '',
          justConnectedUserId:
            becameConnected ?? current.justConnectedUserId,
        }))
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

    return () => {
      active = false
      unsubscribe()
    }
  }, [userId])

  const connectionMap = useMemo(
    () => toConnectionMap(state.connections, userId ?? ''),
    [state.connections, userId],
  )

  const connect = useCallback(
    async (targetUserId: string) => {
      if (!userId) throw new Error('You need to be signed in to connect.')
      // Confirmed by the backend first, then merged so the button does not
      // flicker while the subscription catches up.
      const connection = await connectionService.connect(userId, targetUserId)
      setState((current) => ({
        ...current,
        connections: [
          ...current.connections.filter((entry) => entry.id !== connection.id),
          connection,
        ],
      }))
      return connection
    },
    [userId],
  )

  const cancelRequest = useCallback(
    async (targetUserId: string) => {
      if (!userId) throw new Error('You need to be signed in to do that.')
      await connectionService.cancelRequest(userId, targetUserId)
      setState((current) => ({
        ...current,
        connections: current.connections.filter(
          (entry) => !entry.participants.includes(targetUserId),
        ),
      }))
    },
    [userId],
  )

  const clearJustConnected = useCallback(
    () => setState((current) => ({ ...current, justConnectedUserId: null })),
    [],
  )

  const value = useMemo(() => {
    const currentUserId = userId ?? ''
    const entries = [...connectionMap]
    return {
      connections: connectionMap,
      isLoading: state.isLoading,
      error: state.error,
      getConnectionState: (otherUserId: string) =>
        getConnectionState(connectionMap.get(otherUserId), currentUserId),
      incomingUserIds: entries
        .filter(
          ([, connection]) =>
            getConnectionState(connection, currentUserId) ===
            'pending-incoming',
        )
        .map(([otherId]) => otherId),
      connectedCount: entries.filter(
        ([, connection]) => connection.status === 'connected',
      ).length,
      connect,
      cancelRequest,
      justConnectedUserId: state.justConnectedUserId,
      clearJustConnected,
    }
  }, [
    connectionMap,
    state.isLoading,
    state.error,
    state.justConnectedUserId,
    userId,
    connect,
    cancelRequest,
    clearJustConnected,
  ])

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}

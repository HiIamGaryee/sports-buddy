import { createContext } from 'react'

import type { Connection, ConnectionMap, ConnectionState } from '@/types/connection'

export interface ConnectionContextValue {
  /** `otherUserId → connection` for the signed-in user. */
  connections: ConnectionMap
  isLoading: boolean
  error: string
  getConnectionState: (userId: string) => ConnectionState
  /** Ids of people who have asked to connect and are still waiting. */
  incomingUserIds: string[]
  connectedCount: number
  connect: (userId: string) => Promise<Connection>
  cancelRequest: (userId: string) => Promise<void>
  /**
   * Set only when a relationship became mutual while the app was open — an
   * event, not a state, so the success UI never reappears on refresh.
   */
  justConnectedUserId: string | null
  clearJustConnected: () => void
}

export const ConnectionContext = createContext<ConnectionContextValue | null>(
  null,
)

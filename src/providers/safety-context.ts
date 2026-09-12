import { createContext } from 'react'
export interface SafetyContextValue { blockedIds: ReadonlySet<string>; isLoading: boolean; blockUser: (targetUserId: string) => Promise<void>; unblockUser: (targetUserId: string) => Promise<void>; reportUser: (targetUserId: string, reason: import('@/types/safety').ReportReason, note: string | null, context: { type: 'profile' | 'conversation'; connectionId?: string; conversationId?: string }) => Promise<void> }
export const SafetyContext = createContext<SafetyContextValue | null>(null)

import { useEffect, useState } from 'react'

import { activityPlanService } from '@/services/planning/activity-plan-service'
import type { ActivityPlan } from '@/types/planning'

/**
 * Read-only view of a connection's active plan, for surfaces that only need
 * to know whether one exists (the chat header action and its plan card).
 *
 * It reuses the same scoped single-document subscription the planner uses —
 * one listener while a conversation is open, never a query.
 */
interface PreviewState {
  key: string
  plan: ActivityPlan | null
}

export function usePlanPreview(
  conversationId: string | undefined,
  isAuthorized: boolean,
) {
  const key = `${conversationId ?? ''}#${isAuthorized}`
  const [state, setState] = useState<PreviewState>({ key, plan: null })
  // Reset during render when the conversation changes — no effect needed.
  if (state.key !== key) setState({ key, plan: null })

  useEffect(() => {
    if (!conversationId || !isAuthorized) return

    let active = true
    const unsubscribe = activityPlanService.subscribe(
      conversationId,
      (loaded) => {
        if (active) setState({ key, plan: loaded })
      },
      () => {
        // A plan the chat cannot read simply shows the "start one" action.
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [conversationId, isAuthorized, key])

  return state.plan
}

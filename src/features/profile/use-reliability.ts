import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { attendanceService } from '@/services/attendance/attendance-service'
import type { ReliabilityStats } from '@/types/attendance'

interface ReliabilityState {
  stats: ReliabilityStats | null
  isLoading: boolean
  error: string
}

/**
 * A member's own Reliability Profile: verified sessions and show-up rate
 * from group activities they hosted or joined. One-time read, like the rest
 * of Profile — a reliability stat is not realtime data.
 */
export function useReliability() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ReliabilityState>({
    stats: null,
    isLoading: userId !== null,
    error: '',
  })

  useEffect(() => {
    if (!userId) return
    let active = true
    attendanceService
      .getReliability(userId, new Date())
      .then((stats) => {
        if (active) setState({ stats, isLoading: false, error: '' })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          stats: null,
          isLoading: false,
          error:
            loadError instanceof Error ? loadError.message : "We couldn't load your reliability stats.",
        })
      })
    return () => {
      active = false
    }
  }, [userId])

  return state
}

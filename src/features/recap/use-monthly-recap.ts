import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { isFutureMonthKey, monthKeyOf, nextMonthKey, previousMonthKey } from '@/lib/recap'
import { recapService } from '@/services/recap/recap-service'
import type { MonthlyRecap } from '@/types/recap'

interface RecapState {
  key: string
  recap: MonthlyRecap | null
  isLoading: boolean
  error: string
}

/**
 * One month's recap, with Prev/Next navigation. `now` is captured once per
 * mount (a recap page is a snapshot, not a live view) so "the current month"
 * doesn't shift under the reader while they browse.
 */
export function useMonthlyRecap() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [now] = useState(() => new Date())
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(now))
  const [state, setState] = useState<RecapState>({ key: '', recap: null, isLoading: true, error: '' })

  useEffect(() => {
    if (!userId) return
    let active = true
    const key = `${userId}#${monthKey}`

    recapService
      .getMonthlyRecap(userId, monthKey, now)
      .then((recap) => {
        if (active) setState({ key, recap, isLoading: false, error: '' })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setState({
          key,
          recap: null,
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : "We couldn't load your recap.",
        })
      })

    return () => {
      active = false
    }
  }, [userId, monthKey, now])

  const goToPreviousMonth = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true }))
    setMonthKey((current) => previousMonthKey(current))
  }, [])

  const goToNextMonth = useCallback(() => {
    setMonthKey((current) => (isFutureMonthKey(nextMonthKey(current), now) ? current : nextMonthKey(current)))
  }, [now])

  return {
    monthKey,
    recap: state.recap,
    isLoading: state.isLoading || state.key !== `${userId ?? ''}#${monthKey}`,
    error: state.error,
    canGoToNextMonth: !isFutureMonthKey(nextMonthKey(monthKey), now),
    goToPreviousMonth,
    goToNextMonth,
  }
}

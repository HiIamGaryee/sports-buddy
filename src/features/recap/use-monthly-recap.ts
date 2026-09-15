import { useEffect, useState } from 'react'

import { monthlyRecapService } from '@/services/recap/monthly-recap-service'
import type { MonthlyExerciseRecap } from '@/types/exercise'

interface RecapState {
  recap: MonthlyExerciseRecap | null
  isLoading: boolean
  error: string
}

/**
 * The previous calendar month's recap. Loaded beside the profile rather than
 * before it, so the recap never blocks the user's own identity from rendering.
 */
export function useMonthlyRecap() {
  const [state, setState] = useState<RecapState>({
    recap: null,
    isLoading: true,
    error: '',
  })

  useEffect(() => {
    let active = true
    // Read once on mount: the recap month only changes at a month boundary,
    // which no open session needs to react to.
    monthlyRecapService
      .getPreviousMonthRecap(new Date())
      .then((recap) => {
        if (active) setState({ recap, isLoading: false, error: '' })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          recap: null,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "We couldn't load your monthly recap.",
        })
      })

    return () => {
      active = false
    }
  }, [])

  return state
}

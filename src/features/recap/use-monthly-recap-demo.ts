import { useEffect, useState } from 'react'

import { monthlyRecapService } from '@/services/recap/monthly-recap-service'
import type { MonthlyExerciseRecap } from '@/types/exercise'

interface RecapState {
  recap: MonthlyExerciseRecap | null
  isLoading: boolean
  error: string
}

/**
 * DEMO recap, from a static JSON fixture (`last-month-exercise.json`), not
 * live Firestore data — kept alongside the real, Firestore-backed recap at
 * `use-monthly-recap.ts` (which won the identical path in the deploy/main
 * merge) rather than deleted, pending a decision on which UI to carry
 * forward. See `docs/monetization.md` / `docs/project-overview.md`.
 *
 * The previous calendar month's recap. Loaded beside the profile rather than
 * before it, so the recap never blocks the user's own identity from rendering.
 */
export function useMonthlyRecapDemo() {
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

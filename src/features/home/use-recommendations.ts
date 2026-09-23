import { useCallback, useEffect, useState } from 'react'

import { useProfile } from '@/hooks/use-profile'
import { venueService } from '@/services/venue/venue-service'
import type { Venue } from '@/types/venue'

const EMPTY: readonly Venue[] = []

export function useRecommendations() {
  const { profile } = useProfile()
  const sportId = profile?.sports[0]?.sportId ?? null
  const areaId = profile?.area ?? null
  const key = `${sportId ?? ''}#${areaId ?? ''}`
  const [state, setState] = useState({ key: '', venues: EMPTY, isLoading: false, error: '' })

  const load = useCallback(() => {
    if (!sportId || !areaId) {
      setState({ key, venues: EMPTY, isLoading: false, error: '' })
      return
    }

    const area = venueService.getSearchArea(areaId, areaId)
    if (!area) {
      setState({ key, venues: EMPTY, isLoading: false, error: '' })
      return
    }

    setState({ key, venues: EMPTY, isLoading: true, error: '' })
    venueService
      .search(sportId, area)
      .then((result) => setState({ key, venues: result.venues, isLoading: false, error: '' }))
      .catch((loadError: unknown) => {
        setState({
          key,
          venues: EMPTY,
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : "We couldn't load venues.",
        })
      })
  }, [areaId, key, sportId])

  useEffect(() => {
    void load()
  }, [load])

  return { venues: state.key === key ? state.venues : EMPTY, isLoading: state.isLoading, error: state.error, retry: load, sportId }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  MIN_VENUE_QUERY_LENGTH,
  VENUE_SEARCH_DEBOUNCE_MS,
} from '@/constants/venues'
import { venueService } from '@/services/venue/venue-service'
import type { PlanningSearchArea, Venue } from '@/types/venue'
import type { SportId } from '@/types/sports-profile'

interface SearchState {
  key: string
  venues: Venue[]
  isLoading: boolean
  error: string
  isConfigurationError: boolean
}

const cacheKey = (
  sportId: SportId,
  area: PlanningSearchArea,
  query: string,
) =>
  `${sportId}|${area.center.lat.toFixed(4)},${area.center.lng.toFixed(4)}|${area.radiusMeters}|${query.trim().toLowerCase()}`

/**
 * Venue results for one plan. Cost control is the point:
 *
 * - a search happens when the venue step OPENS, or when the user pauses
 *   typing, or when they press retry — never on render, hover or map pan
 * - manual queries are debounced and need a few characters first
 * - identical searches are served from a small in-memory cache that lives as
 *   long as the screen, not a persistent store
 */
export function useVenueSearch(
  sportId: SportId | null,
  area: PlanningSearchArea | null,
) {
  const [query, setQuery] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const cache = useRef(new Map<string, Venue[]>())

  // A query is either long enough to search on, or ignored entirely.
  const activeQuery =
    query.trim().length >= MIN_VENUE_QUERY_LENGTH ? query.trim() : ''

  const requestKey = useMemo(
    () =>
      sportId && area
        ? `${cacheKey(sportId, area, activeQuery)}#${reloadToken}`
        : '',
    [sportId, area, activeQuery, reloadToken],
  )

  const [state, setState] = useState<SearchState>({
    key: '',
    venues: [],
    isLoading: false,
    error: '',
    isConfigurationError: false,
  })

  useEffect(() => {
    if (!sportId || !area || !requestKey) return

    const cached = cache.current.get(requestKey)
    if (cached) {
      setState({
        key: requestKey,
        venues: cached,
        isLoading: false,
        error: '',
        isConfigurationError: false,
      })
      return
    }

    let active = true
    setState((current) => ({ ...current, key: requestKey, isLoading: true, error: '' }))

    // Only a manual query waits; opening the step searches immediately.
    const delay = activeQuery ? VENUE_SEARCH_DEBOUNCE_MS : 0
    const timer = setTimeout(() => {
      venueService
        .search(sportId, area, activeQuery || undefined)
        .then((result) => {
          if (!active) return
          cache.current.set(requestKey, result.venues)
          setState({
            key: requestKey,
            venues: result.venues,
            isLoading: false,
            error: '',
            isConfigurationError: false,
          })
        })
        .catch((searchError: unknown) => {
          if (!active) return
          setState({
            key: requestKey,
            venues: [],
            isLoading: false,
            error:
              searchError instanceof Error
                ? searchError.message
                : "We couldn't load nearby venues.",
            isConfigurationError:
              typeof searchError === 'object' &&
              searchError !== null &&
              'isConfiguration' in searchError
                ? Boolean((searchError as { isConfiguration: unknown }).isConfiguration)
                : false,
          })
        })
    }, delay)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [sportId, area, activeQuery, requestKey])

  const retry = useCallback(() => {
    cache.current.clear()
    setReloadToken((token) => token + 1)
  }, [])

  return {
    query,
    setQuery,
    venues: state.venues,
    isLoading: state.isLoading,
    error: state.error,
    isConfigurationError: state.isConfigurationError,
    retry,
    hasQuery: activeQuery.length > 0,
  }
}

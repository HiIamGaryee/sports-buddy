import { useCallback, useEffect, useMemo, useState } from 'react'

import { useProfile } from '@/hooks/use-profile'
import { createFiltersFromPreferences } from '@/lib/discover-filters'
import { discoverService } from '@/services/discover/discover-service'
import { toMatchingSubject } from '@/services/matching/matching-service'
import type { DiscoverFilters } from '@/types/discover'
import type { DiscoveryProfile } from '@/types/discovery-profile'

interface FeedState {
  key: string
  candidates: DiscoveryProfile[]
  isLoading: boolean
  error: string
}

const loadingState = (key: string): FeedState => ({
  key,
  candidates: [],
  isLoading: true,
  error: '',
})

/**
 * Discover state lives in the feature; the service owns the rules.
 * `filters === null` means "use my saved discovery preferences", which also
 * makes Reset a one-liner and keeps saved preferences untouched.
 */
export function useDiscover() {
  const { profile } = useProfile()
  const [overrides, setOverrides] = useState<DiscoverFilters | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const userId = profile?.id
  // One key per (user, refresh) so a change resets the feed during render
  // instead of through an effect.
  const requestKey = `${userId ?? ''}#${reloadToken}`
  const [feed, setFeed] = useState<FeedState>(() => loadingState(requestKey))
  if (feed.key !== requestKey) setFeed(loadingState(requestKey))

  useEffect(() => {
    if (!userId) return

    let active = true
    const key = `${userId}#${reloadToken}`
    discoverService
      .loadCandidates(userId)
      .then((loaded) => {
        if (active) setFeed({ key, candidates: loaded, isLoading: false, error: '' })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setFeed({
          key,
          candidates: [],
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "We couldn't load sports buddies.",
        })
      })

    return () => {
      active = false
    }
  }, [userId, reloadToken])

  const savedFilters = useMemo(
    () =>
      profile
        ? createFiltersFromPreferences(profile.preferences)
        : {
            sports: [],
            skillLevels: [],
            intents: [],
            areas: [],
            requireAvailabilityOverlap: false,
          },
    [profile],
  )
  const filters = overrides ?? savedFilters

  // Filtering and scoring are both pure, so this recomputes without a read.
  const buddies = useMemo(
    () =>
      profile
        ? discoverService.getRankedCandidates(
            feed.candidates,
            { filters, availability: profile.availability },
            toMatchingSubject(profile),
          )
        : [],
    [feed.candidates, filters, profile],
  )

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])
  const resetFilters = useCallback(() => setOverrides(null), [])

  return {
    buddies,
    totalCandidates: feed.candidates.length,
    isLoading: feed.isLoading,
    error: feed.error,
    filters,
    setFilters: setOverrides,
    resetFilters,
    isCustomFiltered: overrides !== null,
    refresh,
  }
}

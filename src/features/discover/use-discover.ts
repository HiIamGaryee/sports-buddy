import { useCallback, useEffect, useMemo, useState } from 'react'

import { useConnections } from '@/hooks/use-connections'
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
  const { connections } = useConnections()
  const [overrides, setOverrides] = useState<DiscoverFilters | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  // Session-only, deliberately not persisted: refreshing brings them back.
  const [dismissed, setDismissed] = useState<string[]>([])

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

  // Filtering, scoring and the connection join are all pure, so changing a
  // filter or connecting to someone recomputes without another read.
  const buddies = useMemo(() => {
    if (!profile) return []
    const ranked = discoverService.getRankedCandidates(
      feed.candidates,
      { filters, availability: profile.availability },
      toMatchingSubject(profile),
    )
    return discoverService
      .joinConnectionStates(ranked, connections, profile.id)
      .filter((buddy) => !dismissed.includes(buddy.profile.userId))
  }, [feed.candidates, filters, profile, connections, dismissed])

  // People waiting on the user come first; their score is untouched.
  const incoming = useMemo(
    () => buddies.filter((buddy) => buddy.connectionState === 'pending-incoming'),
    [buddies],
  )
  const suggested = useMemo(
    () => buddies.filter((buddy) => buddy.connectionState !== 'pending-incoming'),
    [buddies],
  )

  const refresh = useCallback(() => {
    setDismissed([])
    setReloadToken((token) => token + 1)
  }, [])
  // Both are session-only ways of narrowing the feed, so the one visible
  // escape from an empty feed clears both.
  const resetFilters = useCallback(() => {
    setDismissed([])
    setOverrides(null)
  }, [])
  const dismiss = useCallback(
    (userId: string) => setDismissed((current) => [...current, userId]),
    [],
  )

  return {
    incoming,
    suggested,
    visibleCount: buddies.length,
    totalCandidates: feed.candidates.length,
    isLoading: feed.isLoading,
    error: feed.error,
    filters,
    setFilters: setOverrides,
    resetFilters,
    isCustomFiltered: overrides !== null,
    refresh,
    dismiss,
  }
}

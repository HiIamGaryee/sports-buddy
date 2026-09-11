import { useEffect, useMemo, useState } from 'react'

import {
  createFiltersFromPreferences,
  isVisibleCandidate,
  matchesFilters,
} from '@/lib/discover-filters'
import { discoverService } from '@/services/discover/discover-service'
import type { DiscoveryPreferences } from '@/types/preferences'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { SportsProfile } from '@/types/user'

/**
 * How many buddies the DRAFT preferences would show, so the preview panel
 * reports a real number instead of a decorative one.
 *
 * It reuses Discover's own hard filters, so the count cannot drift from the
 * feed. One read of the same candidate batch Discover uses; changing a chip
 * only re-filters in memory, exactly as the Discover page does.
 */
export function useDiscoveryMatchCount(
  profile: SportsProfile,
  discovery: DiscoveryPreferences,
) {
  const [candidates, setCandidates] = useState<DiscoveryProfile[] | null>(null)
  const userId = profile.id

  useEffect(() => {
    let active = true
    discoverService
      .loadCandidates(userId)
      .then((loaded) => {
        if (active) setCandidates(loaded)
      })
      .catch(() => {
        if (active) setCandidates([])
      })

    return () => {
      active = false
    }
  }, [userId])

  return useMemo(() => {
    if (!candidates) return null
    const filters = createFiltersFromPreferences({
      ...profile.preferences,
      discovery,
    })
    return candidates.filter(
      (candidate) =>
        isVisibleCandidate(candidate, userId) &&
        matchesFilters(candidate, {
          filters,
          availability: profile.availability,
        }),
    ).length
  }, [candidates, discovery, profile.preferences, profile.availability, userId])
}

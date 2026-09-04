import { hasAvailabilityOverlap } from '@/lib/availability'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { CandidateQuery, DiscoverFilters } from '@/types/discover'
import type { UserPreferences } from '@/types/preferences'

/** Filters start from the saved discovery preferences; areas start unrestricted. */
export function createFiltersFromPreferences(
  preferences: UserPreferences,
): DiscoverFilters {
  return {
    sports: [...preferences.discovery.preferredSports],
    skillLevels: [...preferences.discovery.preferredSkillLevels],
    intents: [...preferences.discovery.preferredIntents],
    areas: [],
    requireAvailabilityOverlap:
      preferences.discovery.requireAvailabilityOverlap,
  }
}

export const countActiveFilters = (filters: DiscoverFilters) =>
  (filters.sports.length > 0 ? 1 : 0) +
  (filters.skillLevels.length > 0 ? 1 : 0) +
  (filters.intents.length > 0 ? 1 : 0) +
  (filters.areas.length > 0 ? 1 : 0) +
  (filters.requireAvailabilityOverlap ? 1 : 0)

/**
 * HARD exclusions, applied before any filter or score: you never see
 * yourself, and a profile that is not discoverable is never shown even if a
 * stale projection survived.
 */
export const isVisibleCandidate = (
  candidate: DiscoveryProfile,
  currentUserId: string,
) => candidate.userId !== currentUserId && candidate.discoverable

/**
 * HARD filters. Deliberately simple, deterministic and pure — they decide who
 * is in the feed at all, which is a separate question from how well they
 * match (see src/services/matching).
 */
export function matchesFilters(
  candidate: DiscoveryProfile,
  { filters, availability }: CandidateQuery,
): boolean {
  const { sports, skillLevels, intents, areas } = filters

  // A sport must satisfy both the sport and the skill filter at once, so
  // "badminton + advanced" does not match a beginner badminton player who
  // happens to be an advanced climber.
  const sportMatches = candidate.sports.some(
    (sport) =>
      (sports.length === 0 || sports.includes(sport.sportId)) &&
      (skillLevels.length === 0 || skillLevels.includes(sport.skillLevel)),
  )
  if (!sportMatches) return false

  if (
    intents.length > 0 &&
    !candidate.intents.some((intent) => intents.includes(intent))
  ) {
    return false
  }

  if (areas.length > 0 && (!candidate.area || !areas.includes(candidate.area))) {
    return false
  }

  if (
    filters.requireAvailabilityOverlap &&
    !hasAvailabilityOverlap(candidate.availability, availability)
  ) {
    return false
  }

  return true
}

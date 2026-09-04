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
 * Deliberately simple and deterministic. No weighting, no ranking — that is
 * STEP 7's job.
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

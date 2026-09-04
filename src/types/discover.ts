import type {
  AreaId,
  AvailabilitySlot,
  SkillLevel,
  SportId,
  SportsIntent,
} from '@/types/sports-profile'

/**
 * Temporary, in-session Discover filters. Seeded from the user's saved
 * `DiscoveryPreferences` but never written back to them — changing a filter
 * here must not silently rewrite the profile's preferences.
 * An empty array means "no restriction on this field".
 */
export interface DiscoverFilters {
  sports: SportId[]
  skillLevels: SkillLevel[]
  intents: SportsIntent[]
  areas: AreaId[]
  requireAvailabilityOverlap: boolean
}

export interface CandidateQuery {
  /** Availability of the signed-in user, for the overlap filter. */
  availability: AvailabilitySlot[]
  filters: DiscoverFilters
}

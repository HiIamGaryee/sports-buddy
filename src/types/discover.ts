import type { ConnectionState } from '@/types/connection'
import type { RankedBuddy } from '@/types/matching'
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

/**
 * The Discover view model: the discovery-safe projection, the derived
 * compatibility, and the viewer's relationship with them. Three separate
 * concerns kept as three separate fields — `CompatibilityResult` is never
 * given a `connectionState`, and the projection is never mutated.
 */
export interface DiscoverBuddy extends RankedBuddy {
  connectionState: ConnectionState
}

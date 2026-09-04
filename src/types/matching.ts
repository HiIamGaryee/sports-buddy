import type { DiscoveryProfile } from '@/types/discovery-profile'
import type {
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  SportId,
  UserSport,
} from '@/types/sports-profile'

/** The five weighted factors. Also the reason and breakdown key space. */
export type MatchingFactorKey =
  | 'sports'
  | 'skill'
  | 'availability'
  | 'location'
  | 'budget'

/**
 * Everything the engine needs about the VIEWER — their own sports profile
 * plus the discovery preferences that shape ranking. Built once by
 * `toMatchingSubject()`; the engine never sees the private profile itself.
 */
export interface MatchingSubject {
  sports: UserSport[]
  availability: AvailabilitySlot[]
  area: AreaId | null
  budget: BudgetPreference | null
  /** From `DiscoveryPreferences`. Empty means "no sport preference". */
  preferredSports: SportId[]
}

export interface CompatibilityFactor {
  key: MatchingFactorKey
  /** 0–1, before the weight is applied. */
  normalizedScore: number
  /** Weighted points earned, e.g. 28 of 35. */
  score: number
  /** The factor's weight in points, e.g. 35. */
  maxScore: number
  /** Qualitative wording for the breakdown, e.g. 'Excellent'. */
  label: string
  /** One short human line, e.g. 'Both Intermediate at badminton'. */
  detail: string
  /** Whether the factor found anything to match on at all. */
  matched: boolean
}

export interface MatchingReason {
  type: MatchingFactorKey
  text: string
  /** The factor's normalized score — used to rank reasons. */
  strength: number
}

/**
 * DERIVED data. Never persisted: the same candidate scores differently for
 * every viewer, so a stored score would be wrong for everyone but one person.
 */
export interface CompatibilityResult {
  /** Integer 0–100. */
  score: number
  /** e.g. 'Great fit' — from `COMPATIBILITY_LABELS`. */
  label: string
  factors: Record<MatchingFactorKey, CompatibilityFactor>
  /** Positive, deterministically ordered reasons. */
  reasons: MatchingReason[]
  sharedSports: SportId[]
  bestSportMatch: SportId | null
}

/**
 * The UI-facing pair. The projection is never mutated with derived fields, so
 * STEP 8 can add a connection state alongside `compatibility` without
 * touching either the engine or the privacy boundary.
 */
export interface RankedBuddy {
  profile: DiscoveryProfile
  compatibility: CompatibilityResult
}

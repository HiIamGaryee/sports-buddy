import type { MatchingFactorKey } from '@/types/matching'
import type { SkillLevel } from '@/types/sports-profile'

/**
 * EVERY matching threshold lives in this file. Nothing in the engine, the
 * service or the UI may inline one of these numbers.
 *
 * Weights are expressed in points and must total `MAX_COMPATIBILITY_SCORE`.
 */
export const COMPATIBILITY_WEIGHTS = {
  sports: 35,
  skill: 20,
  availability: 20,
  location: 15,
  budget: 10,
} as const satisfies Record<MatchingFactorKey, number>

export const MAX_COMPATIBILITY_SCORE = 100

/** Ordered weakest → strongest. The index is the rank used for skill distance. */
export const SKILL_RANK = [
  'beginner',
  'casual',
  'intermediate',
  'advanced',
] as const satisfies readonly SkillLevel[]

/** Indexed by |rank difference|, so index 0 is "same level". */
export const SKILL_DIFFERENCE_SCORES = [1, 0.8, 0.4, 0.1] as const

/**
 * One meaningful shared sport is most of what two people need, so the first
 * match carries the bulk of the weight and extra overlap tops it up. Nothing
 * is divided by how many sports a person plays, so a five-sport profile is
 * never penalised.
 */
export const SPORT_FIRST_MATCH_SCORE = 0.7
/** Applied when a sport is shared but none of them is a preferred sport. */
export const SPORT_UNPREFERRED_MATCH_SCORE = 0.5
export const SPORT_EXTRA_MATCH_SCORE = 0.15

/** Indexed by the number of shared periods; anything beyond the last is 1. */
export const AVAILABILITY_SLOT_SCORES = [0, 0.6, 0.8, 1] as const

/** Approximate area compatibility — see docs/matching.md, not distance. */
export const LOCATION_SCORES = {
  sameArea: 1,
  sameRegion: 0.6,
  differentRegion: 0.2,
  unknown: 0,
} as const

export const BUDGET_SCORES = {
  overlap: 1,
  touching: 0.6,
  nearGap: 0.4,
  noOverlap: 0,
} as const

/** A gap in MYR still treated as "nearly the same budget". */
export const BUDGET_NEAR_GAP_MYR = 10

/** Checked highest `min` first. Compatibility is between two people — the
 * wording never judges a person. */
export const COMPATIBILITY_LABELS = [
  { min: 90, label: 'Excellent fit' },
  { min: 75, label: 'Great fit' },
  { min: 60, label: 'Good fit' },
  { min: 40, label: 'Possible fit' },
  { min: 0, label: 'Low fit' },
] as const

/** Per-factor wording for the breakdown, from the normalized 0–1 score. */
export const FACTOR_LABELS = [
  { min: 0.9, label: 'Excellent' },
  { min: 0.7, label: 'Great' },
  { min: 0.5, label: 'Good' },
  { min: 0.25, label: 'Some' },
  { min: 0, label: 'Low' },
] as const

/** Canonical factor order — the weighted sum and the breakdown both use it. */
export const MATCHING_FACTOR_KEYS = [
  'sports',
  'skill',
  'availability',
  'location',
  'budget',
] as const satisfies readonly MatchingFactorKey[]

/** Tie-break order when two reasons are equally strong. */
export const REASON_PRIORITY = [
  'sports',
  'skill',
  'availability',
  'location',
  'budget',
] as const satisfies readonly MatchingFactorKey[]

/** How many reasons a buddy card shows. */
export const MAX_CARD_REASONS = 3

/** Below this a factor is not worth stating as a positive reason. */
export const REASON_MIN_STRENGTH = 0.5

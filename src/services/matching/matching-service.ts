import {
  COMPATIBILITY_LABELS,
  COMPATIBILITY_WEIGHTS,
  FACTOR_LABELS,
  MAX_CARD_REASONS,
  MATCHING_FACTOR_KEYS,
  MAX_COMPATIBILITY_SCORE,
  REASON_MIN_STRENGTH,
  REASON_PRIORITY,
} from '@/services/matching/matching-constants'
import {
  calculateAvailabilityCompatibility,
  calculateBudgetCompatibility,
  calculateLocationCompatibility,
  calculateSkillCompatibility,
  calculateSportCompatibility,
  getBestSportMatch,
  getSharedSports,
  type FactorOutcome,
} from '@/services/matching/matching-factors'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type {
  CompatibilityFactor,
  CompatibilityResult,
  MatchingFactorKey,
  MatchingReason,
  MatchingSubject,
  RankedBuddy,
} from '@/types/matching'
import type { SportsProfile } from '@/types/user'

/**
 * The compatibility engine. Rule-based, deterministic and explainable — no
 * AI, no embeddings, no randomness — and completely pure: it never touches
 * Firebase, storage or React. Weights and thresholds all live in
 * `matching-constants.ts`. See docs/matching.md.
 */

/** Everything the engine may know about the viewer, and nothing more. */
export const toMatchingSubject = (profile: SportsProfile): MatchingSubject => ({
  sports: profile.sports,
  availability: profile.availability,
  area: profile.area,
  budget: profile.budget,
  preferredSports: profile.preferences.discovery.preferredSports,
})

const labelFor = (
  levels: readonly { min: number; label: string }[],
  value: number,
) => levels.find((level) => value >= level.min)?.label ?? levels[levels.length - 1].label

export const getCompatibilityLabel = (score: number) =>
  labelFor(COMPATIBILITY_LABELS, score)

const toFactor = (
  key: MatchingFactorKey,
  outcome: FactorOutcome,
): CompatibilityFactor => {
  const maxScore = COMPATIBILITY_WEIGHTS[key]
  return {
    key,
    normalizedScore: outcome.normalizedScore,
    score: Math.round(outcome.normalizedScore * maxScore),
    maxScore,
    label: labelFor(FACTOR_LABELS, outcome.normalizedScore),
    detail: outcome.detail,
    matched: outcome.matched,
  }
}

/**
 * The whole scoring pipeline for one pair. Every factor is normalized to 0–1
 * first, then weighted, so the arithmetic stays readable and the breakdown
 * always adds up to the headline score.
 */
export function calculateCompatibility(
  subject: MatchingSubject,
  candidate: DiscoveryProfile,
): CompatibilityResult {
  const outcomes: Record<MatchingFactorKey, FactorOutcome> = {
    sports: calculateSportCompatibility(subject, candidate),
    skill: calculateSkillCompatibility(subject, candidate),
    availability: calculateAvailabilityCompatibility(subject, candidate),
    location: calculateLocationCompatibility(subject, candidate),
    budget: calculateBudgetCompatibility(subject, candidate),
  }

  const factors = {
    sports: toFactor('sports', outcomes.sports),
    skill: toFactor('skill', outcomes.skill),
    availability: toFactor('availability', outcomes.availability),
    location: toFactor('location', outcomes.location),
    budget: toFactor('budget', outcomes.budget),
  }

  const weighted = MATCHING_FACTOR_KEYS.reduce(
    (total, key) =>
      total + outcomes[key].normalizedScore * COMPATIBILITY_WEIGHTS[key],
    0,
  )
  const score = Math.min(
    MAX_COMPATIBILITY_SCORE,
    Math.max(0, Math.round(weighted)),
  )

  const sharedSports = getSharedSports(subject, candidate)
  // With a single shared sport the skill reason already names it ("Same
  // badminton level"), so the sports reason would just repeat it.
  const redundantSportReason =
    sharedSports.length === 1 && outcomes.skill.reason !== null

  const reasons: MatchingReason[] = MATCHING_FACTOR_KEYS.flatMap((key) => {
    const { reason, normalizedScore } = outcomes[key]
    if (!reason || normalizedScore < REASON_MIN_STRENGTH) return []
    if (key === 'sports' && redundantSportReason) return []
    return [{ type: key, text: reason, strength: normalizedScore }]
  })

  return {
    score,
    label: getCompatibilityLabel(score),
    factors,
    reasons,
    sharedSports,
    bestSportMatch: getBestSportMatch(subject, candidate),
  }
}

/**
 * Ordered by how many points the factor actually contributed, so a shared
 * sport outranks a perfect budget match, and a genuinely strong factor can
 * still jump the queue. Ties fall back to the fixed factor priority, so two
 * equally strong reasons never swap places between renders.
 */
const contribution = (reason: MatchingReason) =>
  reason.strength * COMPATIBILITY_WEIGHTS[reason.type]

export const getTopMatchingReasons = (
  result: CompatibilityResult,
  limit = MAX_CARD_REASONS,
): MatchingReason[] =>
  [...result.reasons]
    .sort(
      (a, b) =>
        contribution(b) - contribution(a) ||
        REASON_PRIORITY.indexOf(a.type) - REASON_PRIORITY.indexOf(b.type),
    )
    .slice(0, limit)

/**
 * Score descending, then more shared sports, then name — fully deterministic,
 * so a refresh never reshuffles the feed. Ranking is not filtering: a low
 * score still appears, just further down.
 */
export function rankBuddies(
  candidates: readonly DiscoveryProfile[],
  subject: MatchingSubject,
): RankedBuddy[] {
  return candidates
    .map((profile) => ({
      profile,
      compatibility: calculateCompatibility(subject, profile),
    }))
    .sort(
      (a, b) =>
        b.compatibility.score - a.compatibility.score ||
        b.compatibility.sharedSports.length -
          a.compatibility.sharedSports.length ||
        a.profile.displayName.localeCompare(b.profile.displayName) ||
        a.profile.userId.localeCompare(b.profile.userId),
    )
}

import { getAreaRegion } from '@/constants/areas'
import { WEEK_DAYS } from '@/constants/profile-options'
import { countSharedPeriods, getSharedAvailability } from '@/lib/availability'
import {
  formatBudget,
  getAreaName,
  getPeriodLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import {
  AVAILABILITY_SLOT_SCORES,
  BUDGET_NEAR_GAP_MYR,
  BUDGET_SCORES,
  LOCATION_SCORES,
  SKILL_DIFFERENCE_SCORES,
  SKILL_RANK,
  SPORT_EXTRA_MATCH_SCORE,
  SPORT_FIRST_MATCH_SCORE,
  SPORT_UNPREFERRED_MATCH_SCORE,
} from '@/services/matching/matching-constants'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { MatchingSubject } from '@/types/matching'
import type {
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  SkillLevel,
  SportId,
} from '@/types/sports-profile'

/**
 * PURE factor calculators. No Firebase, no storage, no React, no `Date.now()`
 * — input in, score out — so the same pair always produces the same number.
 *
 * Every calculator returns the same envelope: a normalized 0–1 score, one
 * short line for the breakdown, and an optional positive reason. Missing data
 * scores 0 rather than being skipped, so an empty profile never looks perfect.
 */
export interface FactorOutcome {
  normalizedScore: number
  detail: string
  /** `null` when there is nothing positive to claim. */
  reason: string | null
  matched: boolean
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const skillRank = (level: SkillLevel) => SKILL_RANK.indexOf(level)

const lowerSport = (sportId: SportId) => getSportName(sportId).toLowerCase()

const dayLabel = (slot: AvailabilitySlot) =>
  WEEK_DAYS.find((day) => day.id === slot.day)?.label ?? slot.day

/**
 * Shared sports, ordered with the viewer's PREFERRED sports first and then in
 * the order they listed them — a stable order the reasons can rely on.
 */
export function getSharedSports(
  subject: MatchingSubject,
  candidate: Pick<DiscoveryProfile, 'sports'>,
): SportId[] {
  const theirs = candidate.sports.map((sport) => sport.sportId)
  const shared = subject.sports
    .map((sport) => sport.sportId)
    .filter((sportId) => theirs.includes(sportId))

  const preferred = shared.filter((sportId) => isPreferred(subject, sportId))
  return [...preferred, ...shared.filter((sportId) => !preferred.includes(sportId))]
}

/** An empty preference list means "no sport preference", not "none of them". */
const isPreferred = (subject: MatchingSubject, sportId: SportId) =>
  subject.preferredSports.length === 0 ||
  subject.preferredSports.includes(sportId)

const skillOf = (sports: { sportId: SportId; skillLevel: SkillLevel }[], sportId: SportId) =>
  sports.find((sport) => sport.sportId === sportId)?.skillLevel ?? null

/** Normalized skill compatibility for one sport both people play. */
export function getSkillScore(a: SkillLevel, b: SkillLevel): number {
  const difference = Math.abs(skillRank(a) - skillRank(b))
  return SKILL_DIFFERENCE_SCORES[difference] ?? 0
}

/**
 * ONE best shared sport, chosen by skill compatibility. Two people only need
 * a single sport that works to play together; extra overlap is credited to
 * the sports factor instead.
 */
export function getBestSportMatch(
  subject: MatchingSubject,
  candidate: Pick<DiscoveryProfile, 'sports'>,
): SportId | null {
  const shared = getSharedSports(subject, candidate)
  return shared.reduce<SportId | null>((best, sportId) => {
    if (!best) return sportId
    return getSkillScore(...skillPair(subject, candidate, sportId)) >
      getSkillScore(...skillPair(subject, candidate, best))
      ? sportId
      : best
  }, null)
}

function skillPair(
  subject: MatchingSubject,
  candidate: Pick<DiscoveryProfile, 'sports'>,
  sportId: SportId,
): [SkillLevel, SkillLevel] {
  return [
    skillOf(subject.sports, sportId) ?? 'beginner',
    skillOf(candidate.sports, sportId) ?? 'beginner',
  ]
}

/** 35% — the most important factor. No shared sport means no points at all. */
export function calculateSportCompatibility(
  subject: MatchingSubject,
  candidate: Pick<DiscoveryProfile, 'sports'>,
): FactorOutcome {
  const shared = getSharedSports(subject, candidate)
  if (shared.length === 0) {
    return {
      normalizedScore: 0,
      detail: 'No shared sport yet',
      reason: null,
      matched: false,
    }
  }

  const base = shared.some((sportId) => isPreferred(subject, sportId))
    ? SPORT_FIRST_MATCH_SCORE
    : SPORT_UNPREFERRED_MATCH_SCORE
  const extra = (shared.length - 1) * SPORT_EXTRA_MATCH_SCORE
  const others = shared.length - 1
  const best = shared[0]

  return {
    normalizedScore: clamp01(base + extra),
    detail:
      others === 0
        ? `Shares ${lowerSport(best)}`
        : `Shares ${lowerSport(best)} and ${others} more`,
    reason:
      others === 0
        ? `Both play ${lowerSport(best)}`
        : `${getSportName(best)} + ${others} more shared sport${others > 1 ? 's' : ''}`,
    matched: true,
  }
}

/** 20% — measured on the BEST shared sport, never across unrelated sports. */
export function calculateSkillCompatibility(
  subject: MatchingSubject,
  candidate: Pick<DiscoveryProfile, 'sports'>,
): FactorOutcome {
  const best = getBestSportMatch(subject, candidate)
  if (!best) {
    return {
      normalizedScore: 0,
      detail: 'No shared sport to compare',
      reason: null,
      matched: false,
    }
  }

  const [mine, theirs] = skillPair(subject, candidate, best)
  const difference = Math.abs(skillRank(mine) - skillRank(theirs))

  return {
    normalizedScore: getSkillScore(mine, theirs),
    detail:
      difference === 0
        ? `Both ${getSkillLabel(mine)} at ${lowerSport(best)}`
        : `${getSportName(best)}: ${getSkillLabel(mine)} vs ${getSkillLabel(theirs)}`,
    reason:
      difference === 0
        ? `Same ${lowerSport(best)} level`
        : difference === 1
          ? `Similar ${lowerSport(best)} level`
          : null,
    matched: true,
  }
}

/** 20% — one workable shared slot already matters; identical diaries do not. */
export function calculateAvailabilityCompatibility(
  subject: Pick<MatchingSubject, 'availability'>,
  candidate: Pick<DiscoveryProfile, 'availability'>,
): FactorOutcome {
  const shared = getSharedAvailability(
    subject.availability,
    candidate.availability,
  )
  const periods = countSharedPeriods(
    subject.availability,
    candidate.availability,
  )
  if (periods === 0) {
    return {
      normalizedScore: 0,
      detail: 'No shared time yet',
      reason: null,
      matched: false,
    }
  }

  const first = shared[0]
  const firstSlot = `${dayLabel(first)} ${getPeriodLabel(first.periods[0]).toLowerCase()}`

  return {
    normalizedScore:
      AVAILABILITY_SLOT_SCORES[periods] ??
      AVAILABILITY_SLOT_SCORES[AVAILABILITY_SLOT_SCORES.length - 1],
    detail:
      periods === 1
        ? `Both free ${firstSlot}`
        : `${periods} shared time slots, from ${firstSlot}`,
    reason: `Both free ${firstSlot}`,
    matched: true,
  }
}

/**
 * 15% — APPROXIMATE AREA COMPATIBILITY ONLY. There are no coordinates in the
 * app, so this must never imply a distance. Swapping this one function for a
 * distance-based provider is the whole location upgrade path.
 */
export function calculateLocationCompatibility(
  subject: Pick<MatchingSubject, 'area'>,
  candidate: Pick<DiscoveryProfile, 'area'>,
): FactorOutcome {
  if (!subject.area || !candidate.area) {
    return {
      normalizedScore: LOCATION_SCORES.unknown,
      detail: 'No area set yet',
      reason: null,
      matched: false,
    }
  }

  if (subject.area === candidate.area) {
    return {
      normalizedScore: LOCATION_SCORES.sameArea,
      detail: `Same area — ${getAreaName(candidate.area)}`,
      reason: `Both in ${getAreaName(candidate.area)}`,
      matched: true,
    }
  }

  const sameRegion = isSameRegion(subject.area, candidate.area)
  return {
    normalizedScore: sameRegion
      ? LOCATION_SCORES.sameRegion
      : LOCATION_SCORES.differentRegion,
    detail: sameRegion
      ? `${getAreaName(candidate.area)} — same general region`
      : `Different area — ${getAreaName(candidate.area)}`,
    reason: sameRegion ? 'Same general region' : null,
    matched: sameRegion,
  }
}

const isSameRegion = (a: AreaId, b: AreaId) => {
  const region = getAreaRegion(a)
  return region !== null && region === getAreaRegion(b)
}

/** `null` max means open ended (RM60+), so arithmetic uses Infinity. */
const upperBound = (budget: BudgetPreference) => budget.max ?? Infinity

/** 10% — structured ranges only; never parses a display string. */
export function calculateBudgetCompatibility(
  subject: Pick<MatchingSubject, 'budget'>,
  candidate: Pick<DiscoveryProfile, 'budget'>,
): FactorOutcome {
  const mine = subject.budget
  const theirs = candidate.budget
  if (!mine || !theirs) {
    return {
      normalizedScore: 0,
      detail: 'No budget set yet',
      reason: null,
      matched: false,
    }
  }

  const from = Math.max(mine.min, theirs.min)
  const to = Math.min(upperBound(mine), upperBound(theirs))
  const comparison = `${formatBudget(theirs)} vs your ${formatBudget(mine)}`

  if (to > from) {
    const overlap = formatBudget({
      min: from,
      max: Number.isFinite(to) ? to : null,
    })
    return {
      normalizedScore: BUDGET_SCORES.overlap,
      detail: `Shared budget ${overlap}`,
      reason: `Shared budget ${overlap}`,
      matched: true,
    }
  }

  if (to === from) {
    return {
      normalizedScore: BUDGET_SCORES.touching,
      detail: `Budgets just about meet — ${comparison}`,
      reason: 'Similar activity budget',
      matched: true,
    }
  }

  const gap = from - to
  return {
    normalizedScore:
      gap <= BUDGET_NEAR_GAP_MYR
        ? BUDGET_SCORES.nearGap
        : BUDGET_SCORES.noOverlap,
    detail: `${gap <= BUDGET_NEAR_GAP_MYR ? 'Close' : 'Different'} budgets — ${comparison}`,
    reason: null,
    matched: false,
  }
}

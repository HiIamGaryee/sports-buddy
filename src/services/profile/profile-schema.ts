import { AREAS } from '@/constants/areas'
import {
  ACTIVITY_INTENSITIES,
  DAY_PERIODS,
  RADIUS_OPTIONS,
  SKILL_LEVELS,
  SPORTS_INTENTS,
  WEEK_DAYS,
} from '@/constants/profile-options'
import { MAX_SPORTS, SPORTS } from '@/constants/sports'
import { normalizeMultiLine, normalizeSingleLine } from '@/lib/sanitize'
import { safeImageUrl } from '@/lib/safe-url'
import type {
  ActivityIntensity,
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  DayPeriod,
  SaveProfileInput,
  SkillLevel,
  SportId,
  SportsIntent,
  UserSport,
  WeekDay,
} from '@/types/sports-profile'

/**
 * PROFILE DOMAIN SCHEMA.
 *
 * Everything a profile can contain, checked against the centralized option
 * datasets rather than against a hand-written list. Adding a sport to
 * `SPORTS` therefore makes it valid here automatically, and a sport that is
 * NOT in `SPORTS` can never be persisted, projected into `publicProfiles`, or
 * fed to the matching engine.
 *
 * This exists because presence checks were the only validation: `sports.length
 * > 0` accepted `[{ sportId: 'anything', skillLevel: 'god' }]`, which would
 * then be rendered to other members and scored by the matching engine.
 */

/** The longest a display name may be. Shared by the UI, the service and the rules. */
export const MAX_DISPLAY_NAME_LENGTH = 40
export const MIN_DISPLAY_NAME_LENGTH = 2

/** Caps that bound a single profile document's size. */
export const MAX_INTENTS = SPORTS_INTENTS.length
export const MAX_AVAILABILITY_SLOTS = WEEK_DAYS.length

/** Nobody's usual budget for one session is five figures. */
const MAX_BUDGET_MYR = 10_000

const ids = <T extends { id: string }>(options: readonly T[]) =>
  new Set<string>(options.map((option) => option.id))

const SPORT_IDS = ids(SPORTS)
const SKILL_IDS = ids(SKILL_LEVELS)
const INTENT_IDS = ids(SPORTS_INTENTS)
const INTENSITY_IDS = ids(ACTIVITY_INTENSITIES)
const AREA_IDS = ids(AREAS)
const DAY_IDS = ids(WEEK_DAYS)
const PERIOD_IDS = ids(DAY_PERIODS)

export const isSportId = (value: unknown): value is SportId =>
  typeof value === 'string' && SPORT_IDS.has(value)

export const isSkillLevel = (value: unknown): value is SkillLevel =>
  typeof value === 'string' && SKILL_IDS.has(value)

export const isSportsIntent = (value: unknown): value is SportsIntent =>
  typeof value === 'string' && INTENT_IDS.has(value)

export const isActivityIntensity = (
  value: unknown,
): value is ActivityIntensity =>
  typeof value === 'string' && INTENSITY_IDS.has(value)

export const isAreaId = (value: unknown): value is AreaId =>
  typeof value === 'string' && AREA_IDS.has(value)

export const isWeekDay = (value: unknown): value is WeekDay =>
  typeof value === 'string' && DAY_IDS.has(value)

export const isDayPeriod = (value: unknown): value is DayPeriod =>
  typeof value === 'string' && PERIOD_IDS.has(value)

export const isRadiusKm = (value: unknown): value is number =>
  typeof value === 'number' &&
  (RADIUS_OPTIONS as readonly number[]).includes(value)

/**
 * A budget is two finite numbers, or a finite floor with an open top.
 * `NaN`, `Infinity`, negatives, a max below the min and a string that happens
 * to look like a number are all rejected — `Number.isFinite` is the check that
 * does most of the work, because `NaN >= 0` is false but `NaN` still survives
 * a naive `typeof value === 'number'`.
 */
export function isValidBudget(value: unknown): value is BudgetPreference {
  if (!value || typeof value !== 'object') return false
  const budget = value as { min?: unknown; max?: unknown }

  if (typeof budget.min !== 'number' || !Number.isFinite(budget.min)) return false
  if (budget.min < 0 || budget.min > MAX_BUDGET_MYR) return false

  if (budget.max === null || budget.max === undefined) return true
  if (typeof budget.max !== 'number' || !Number.isFinite(budget.max)) return false
  return budget.max >= budget.min && budget.max <= MAX_BUDGET_MYR
}

/** One sport entry: a known sport at a known level. */
export const isValidSport = (value: unknown): value is UserSport =>
  Boolean(value) &&
  typeof value === 'object' &&
  isSportId((value as UserSport).sportId) &&
  isSkillLevel((value as UserSport).skillLevel)

/**
 * The sports array: within the documented cap, every entry valid, and no
 * duplicate sport — a duplicate would double-count in compatibility scoring.
 */
export function isValidSports(value: unknown): value is UserSport[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SPORTS) {
    return false
  }
  if (!value.every(isValidSport)) return false
  return new Set(value.map((sport) => sport.sportId)).size === value.length
}

/**
 * Sport SELECTION only: within the cap, every entry a known sport id, no
 * duplicates — deliberately silent on `skillLevel`, because onboarding's
 * sports step chooses sports before its skills step assigns a level. The
 * skill level itself is validated once it exists (`isValidSports`, run from
 * `profileRules.skills`), so a full save is still checked as strictly.
 */
export function isValidSportSelection(
  value: unknown,
): value is { sportId: SportId }[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SPORTS) {
    return false
  }
  if (!value.every((entry) => isSportId((entry as { sportId?: unknown })?.sportId))) {
    return false
  }
  const sportIds = value.map((entry) => (entry as { sportId: SportId }).sportId)
  return new Set(sportIds).size === sportIds.length
}

export function isValidIntents(value: unknown): value is SportsIntent[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_INTENTS) {
    return false
  }
  if (!value.every(isSportsIntent)) return false
  return new Set(value).size === value.length
}

/** One availability row: a known day and a set of known, non-repeating periods. */
export function isValidAvailabilitySlot(
  value: unknown,
): value is AvailabilitySlot {
  if (!value || typeof value !== 'object') return false
  const slot = value as AvailabilitySlot
  if (!isWeekDay(slot.day)) return false
  if (!Array.isArray(slot.periods)) return false
  if (slot.periods.length > DAY_PERIODS.length) return false
  if (!slot.periods.every(isDayPeriod)) return false
  return new Set(slot.periods).size === slot.periods.length
}

export function isValidAvailability(value: unknown): value is AvailabilitySlot[] {
  if (!Array.isArray(value) || value.length > MAX_AVAILABILITY_SLOTS) return false
  if (!value.every(isValidAvailabilitySlot)) return false
  return new Set(value.map((slot) => slot.day)).size === value.length
}

/**
 * NORMALIZATION + ALLOWLIST in one place.
 *
 * The returned object is built field by field, so anything extra a caller
 * attached — `admin: true`, `__proto__`, a copied Firestore document — is
 * dropped before it can reach `setDoc`. This is what makes the repository's
 * write a fixed shape rather than whatever the client happened to hold.
 */
export function toSafeProfileInput(input: SaveProfileInput): SaveProfileInput {
  return {
    // No truncation: `profileRules` reports an over-long name or bio, so the
    // user is told rather than quietly having their text cut.
    displayName: normalizeSingleLine(input.displayName ?? ''),
    bio: normalizeMultiLine(input.bio ?? ''),
    sports: (input.sports ?? []).filter(
      (sport) => isSportId(sport.sportId) && sport.skillLevel !== undefined,
    ),
    intents: (input.intents ?? []).filter(isSportsIntent),
    preferredIntensity: isActivityIntensity(input.preferredIntensity)
      ? input.preferredIntensity
      : null,
    // Days the user left empty are dropped so stored availability stays meaningful.
    availability: (input.availability ?? [])
      .filter(isValidAvailabilitySlot)
      .filter((slot) => slot.periods.length > 0),
    area: isAreaId(input.area) ? input.area : null,
    radiusKm: isRadiusKm(input.radiusKm) ? input.radiusKm : null,
    budget: isValidBudget(input.budget) ? input.budget : null,
    ...(input.preferences ? { preferences: input.preferences } : {}),
  }
}

/**
 * A photo URL from an auth provider or another member's public projection.
 * Anything that is not https becomes `null`, and the avatar falls back to
 * initials — `data:` and `javascript:` never reach an `<img src>`.
 */
export const toSafePhotoUrl = (raw: unknown): string | null => safeImageUrl(raw)

import { MAX_BIO_LENGTH } from '@/constants/profile-options'
import { MAX_SPORTS } from '@/constants/sports'
import { hasUnsafeCharacters } from '@/lib/sanitize'
import { validateDisplayName } from '@/lib/validation'
import {
  isActivityIntensity,
  isAreaId,
  isRadiusKm,
  isValidAvailability,
  isValidBudget,
  isValidSocialUsername,
  isValidIntents,
  isValidSports,
  isValidSportSelection,
} from '@/services/profile/profile-schema'
import type {
  ActivityIntensity,
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  SaveProfileInput,
  SkillLevel,
} from '@/types/sports-profile'
import { isGender } from '@/types/gender'

/**
 * Every profile rule lives here, each taking only the field it inspects, so
 * onboarding can reuse them per step on its draft (where skills may be unset)
 * and the service can run the full check before persisting.
 */
export const profileRules = {
  displayName: validateDisplayName,

  gender: (gender: unknown) =>
    isGender(gender) ? undefined : 'Choose a valid gender.',

  /**
   * Membership, not just presence — sport SELECTION only. Skill level is not
   * inspected here: onboarding's sports step runs before its skills step
   * assigns one, so a sport just picked always has `skillLevel: null`.
   * `profileRules.skills` is what validates the level, once it exists.
   */
  sports: (sports: readonly unknown[]) => {
    if (sports.length === 0) return 'Choose at least one sport.'
    if (sports.length > MAX_SPORTS) return `Choose up to ${MAX_SPORTS} sports.`
    return isValidSportSelection(sports) ? undefined : 'Choose a valid sport.'
  },

  /**
   * Presence AND membership. Before this, an unset level was caught but an
   * invalid one (`'wizard'`) was not, because only `null` was checked.
   */
  skills: (sports: readonly { skillLevel: SkillLevel | null }[]) => {
    if (sports.some((sport) => sport.skillLevel === null)) {
      return 'Set a skill level for every sport.'
    }
    return isValidSports(sports) ? undefined : 'Choose a valid skill level.'
  },

  intents: (intents: readonly unknown[]) => {
    if (intents.length === 0) {
      return 'Pick at least one thing you are looking for.'
    }
    return isValidIntents(intents) ? undefined : 'Choose a valid option.'
  },

  intensity: (intensity: ActivityIntensity | null) => {
    if (intensity === null) return 'Choose how you usually like to play.'
    return isActivityIntensity(intensity)
      ? undefined
      : 'Choose a valid playing style.'
  },

  availability: (availability: readonly AvailabilitySlot[]) => {
    if (availability.every((slot) => slot.periods.length === 0)) {
      return 'Select at least one time you are usually free.'
    }
    return isValidAvailability(availability)
      ? undefined
      : 'Choose a valid time.'
  },

  area: (area: AreaId | null) => {
    if (area === null) return 'Choose your general area.'
    return isAreaId(area) ? undefined : 'Choose a valid area.'
  },

  radius: (radiusKm: number | null) => {
    if (radiusKm === null) return 'Choose how far you can travel.'
    return isRadiusKm(radiusKm) ? undefined : 'Choose a valid distance.'
  },

  budget: (budget: BudgetPreference | null) => {
    if (budget === null) return 'Choose your usual budget.'
    return isValidBudget(budget) ? undefined : 'Choose a valid budget.'
  },

  bio: (bio: string) => {
    if (bio.length > MAX_BIO_LENGTH) {
      return `Keep your bio under ${MAX_BIO_LENGTH} characters.`
    }
    return hasUnsafeCharacters(bio)
      ? 'Your bio contains characters we can\u2019t save.'
      : undefined
  },

  instagramUsername: (username: string | undefined) =>
    isValidSocialUsername(username ?? '') ? undefined : 'Enter a valid Instagram username.',

  linkedinUsername: (username: string | undefined) =>
    isValidSocialUsername(username ?? '') ? undefined : 'Enter a valid LinkedIn username.',
} as const

/** First blocking problem, or `undefined` when the profile is complete. */
export function validateProfileInput(input: SaveProfileInput) {
  return (
    profileRules.displayName(input.displayName) ??
    profileRules.sports(input.sports) ??
    profileRules.skills(input.sports) ??
    profileRules.intents(input.intents) ??
    profileRules.intensity(input.preferredIntensity) ??
    profileRules.availability(input.availability) ??
    profileRules.area(input.area) ??
    profileRules.radius(input.radiusKm) ??
    profileRules.budget(input.budget) ??
    profileRules.instagramUsername(input.instagramUsername) ??
    profileRules.linkedinUsername(input.linkedinUsername) ??
    profileRules.bio(input.bio)
  )
}

import { MAX_BIO_LENGTH } from '@/constants/profile-options'
import { validateDisplayName } from '@/lib/validation'
import type {
  ActivityIntensity,
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  SaveProfileInput,
  SkillLevel,
} from '@/types/sports-profile'

/**
 * Every profile rule lives here, each taking only the field it inspects, so
 * onboarding can reuse them per step on its draft (where skills may be unset)
 * and the service can run the full check before persisting.
 */
export const profileRules = {
  displayName: validateDisplayName,

  sports: (sports: readonly unknown[]) =>
    sports.length === 0 ? 'Choose at least one sport.' : undefined,

  skills: (sports: readonly { skillLevel: SkillLevel | null }[]) =>
    sports.some((sport) => sport.skillLevel === null)
      ? 'Set a skill level for every sport.'
      : undefined,

  intents: (intents: readonly unknown[]) =>
    intents.length === 0
      ? 'Pick at least one thing you are looking for.'
      : undefined,

  intensity: (intensity: ActivityIntensity | null) =>
    intensity === null ? 'Choose how you usually like to play.' : undefined,

  availability: (availability: readonly AvailabilitySlot[]) =>
    availability.every((slot) => slot.periods.length === 0)
      ? 'Select at least one time you are usually free.'
      : undefined,

  area: (area: AreaId | null) =>
    area === null ? 'Choose your general area.' : undefined,

  radius: (radiusKm: number | null) =>
    radiusKm === null ? 'Choose how far you can travel.' : undefined,

  budget: (budget: BudgetPreference | null) =>
    budget === null ? 'Choose your usual budget.' : undefined,

  bio: (bio: string) =>
    bio.length > MAX_BIO_LENGTH
      ? `Keep your bio under ${MAX_BIO_LENGTH} characters.`
      : undefined,
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
    profileRules.bio(input.bio)
  )
}

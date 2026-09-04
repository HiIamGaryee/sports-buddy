import { MAX_BIO_LENGTH } from '@/constants/profile-options'
import type { SaveProfileInput } from '@/types/sports-profile'

export interface ProfileCompleteness {
  /** 0–100. Required fields are worth 90, the optional bio the last 10. */
  percent: number
  missing: string[]
  hint?: string
}

type CompletenessSource = Pick<
  SaveProfileInput,
  | 'displayName'
  | 'sports'
  | 'intents'
  | 'preferredIntensity'
  | 'availability'
  | 'area'
  | 'radiusKm'
  | 'budget'
  | 'bio'
>

const REQUIRED_CHECKS = [
  {
    label: 'Display name',
    isComplete: (p: CompletenessSource) => p.displayName.trim().length > 0,
  },
  { label: 'Sports', isComplete: (p: CompletenessSource) => p.sports.length > 0 },
  {
    label: 'Skill levels',
    isComplete: (p: CompletenessSource) =>
      p.sports.length > 0 && p.sports.every((sport) => sport.skillLevel),
  },
  {
    label: 'What you are looking for',
    isComplete: (p: CompletenessSource) => p.intents.length > 0,
  },
  {
    label: 'Playing style',
    isComplete: (p: CompletenessSource) => p.preferredIntensity !== null,
  },
  {
    label: 'Availability',
    isComplete: (p: CompletenessSource) =>
      p.availability.some((slot) => slot.periods.length > 0),
  },
  { label: 'Area', isComplete: (p: CompletenessSource) => p.area !== null },
  {
    label: 'Travel radius',
    isComplete: (p: CompletenessSource) => p.radiusKm !== null,
  },
  { label: 'Budget', isComplete: (p: CompletenessSource) => p.budget !== null },
] as const

const REQUIRED_WEIGHT = 90
const BIO_WEIGHT = 100 - REQUIRED_WEIGHT

/** The one place profile strength is calculated. */
export function getProfileCompleteness(
  profile: CompletenessSource,
): ProfileCompleteness {
  const missing = REQUIRED_CHECKS.filter(
    (check) => !check.isComplete(profile),
  ).map((check) => check.label)

  const completedRequired = REQUIRED_CHECKS.length - missing.length
  const requiredScore = Math.round(
    (completedRequired / REQUIRED_CHECKS.length) * REQUIRED_WEIGHT,
  )
  const hasBio = profile.bio.trim().length > 0
  const percent = requiredScore + (hasBio ? BIO_WEIGHT : 0)

  if (missing.length > 0) {
    return { percent, missing, hint: `Add your ${missing[0].toLowerCase()}.` }
  }
  if (!hasBio) {
    return {
      percent,
      missing: [],
      hint: `Add a short bio (up to ${MAX_BIO_LENGTH} characters) to complete your profile.`,
    }
  }
  return { percent, missing: [] }
}

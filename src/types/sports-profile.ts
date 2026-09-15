import type { UserPreferences } from '@/types/preferences'
import type { Gender } from '@/types/gender'

export type SportId =
  | 'badminton'
  | 'running'
  | 'pickleball'
  | 'climbing'
  | 'gym'
  | 'tennis'
  | 'futsal'
  | 'basketball'

export type SkillLevel = 'beginner' | 'casual' | 'intermediate' | 'advanced'

export type SportsIntent = 'casual' | 'training' | 'competitive' | 'social'

export type ActivityIntensity = 'relaxed' | 'moderate' | 'high'

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type DayPeriod = 'morning' | 'afternoon' | 'evening'

export type AreaId =
  | 'kuala-lumpur'
  | 'petaling-jaya'
  | 'subang-jaya'
  | 'shah-alam'
  | 'puchong'
  | 'cheras'
  | 'ampang'
  | 'kepong'
  | 'setapak'

export interface UserSport {
  sportId: SportId
  skillLevel: SkillLevel
}

export interface AvailabilitySlot {
  day: WeekDay
  periods: DayPeriod[]
}

/** `max: null` means open ended (e.g. RM60+). Values are in MYR. */
export interface BudgetPreference {
  min: number
  max: number | null
}

/** The sports half of `users/{uid}` — everything onboarding collects. */
export interface SportsProfileFields {
  bio: string
  instagramUsername?: string
  linkedinUsername?: string
  sports: UserSport[]
  intents: SportsIntent[]
  preferredIntensity: ActivityIntensity | null
  availability: AvailabilitySlot[]
  area: AreaId | null
  radiusKm: number | null
  budget: BudgetPreference | null
}

/** What onboarding and profile editing write to `users/{uid}`. */
export interface SaveProfileInput extends SportsProfileFields {
  displayName: string
  /** Present during onboarding; omitted by normal profile edits. */
  gender?: Gender | null
  /** Only set when onboarding seeds the defaults; edits leave it untouched. */
  preferences?: UserPreferences
}

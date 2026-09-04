import type { UserPreferences } from '@/types/preferences'
import type { SportsProfileFields } from '@/types/sports-profile'

/** Account fields mirrored from auth when `users/{uid}` is first created. */
export interface UserRecord {
  id: string
  email: string
  displayName: string
  photoUrl: string | null
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

/**
 * The full PRIVATE profile document (`users/{uid}`): account fields, the
 * sports profile from onboarding, and the user's preferences. `id` is the
 * auth uid. Never expose this shape to another user — project it through
 * `toDiscoveryProfile()` instead.
 */
export interface SportsProfile extends UserRecord, SportsProfileFields {
  preferences: UserPreferences
}

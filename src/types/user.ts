import type { UserPreferences } from '@/types/preferences'
import type { SportsProfileFields } from '@/types/sports-profile'
import type { Gender } from '@/types/gender'

/** Account fields mirrored from auth when `users/{uid}` is first created. */
export interface UserRecord {
  id: string
  email: string
  displayName: string
  photoUrl: string | null
  /** Public identity metadata. Null only for legacy/Google users before completion. */
  gender: Gender | null
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

/**
 * A pending photo edit, saved together with the rest of the profile: a new
 * file to upload, or an existing URL (a provider photo, or `null` for
 * initials) to switch to.
 */
export type ProfilePhotoChange = { file: File } | { url: string | null }

import type { AuthUser } from '@/types/auth'
import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput, SportsProfileFields } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'
import type { Gender } from '@/types/gender'

/**
 * `users/{uid}` — the private profile document. Backend agnostic; no Firebase
 * types cross this line.
 */
export interface ProfileRepository {
  getByUserId(userId: string): Promise<SportsProfile | null>
  /** Creates the minimal document on first sign-in; never overwrites. */
  createIfMissing(user: AuthUser, gender?: Gender | null): Promise<SportsProfile>
  setGender(userId: string, gender: Gender): Promise<SportsProfile>
  /**
   * Merges profile data into the existing document and marks onboarding
   * complete. Used by onboarding completion and by profile editing.
   */
  saveProfile(userId: string, input: SaveProfileInput): Promise<SportsProfile>
  /** Merges preferences only, leaving profile fields untouched. */
  updatePreferences(
    userId: string,
    preferences: UserPreferences,
  ): Promise<SportsProfile>
}

export const EMPTY_PROFILE_FIELDS: SportsProfileFields = {
  bio: '',
  sports: [],
  intents: [],
  preferredIntensity: null,
  availability: [],
  area: null,
  radiusKm: null,
  budget: null,
}

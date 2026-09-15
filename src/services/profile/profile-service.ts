import {
  createDefaultUserPreferences,
  reconcileDiscoveryPreferences,
} from '@/lib/preferences'
import { toDiscoveryProfile } from '@/lib/discovery-profile'
import {
  profileRepository,
  publicProfileRepository,
} from '@/repositories/repositories'
import { toSafeProfileInput } from '@/services/profile/profile-schema'
import { validateProfileInput } from '@/services/profile/profile-validation'
import type { AuthUser } from '@/types/auth'
import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'
import { isGender } from '@/types/gender'
import type { Gender } from '@/types/gender'

const SAVE_FAILED_MESSAGE = "We couldn't save your profile. Please try again."
const PREFERENCES_FAILED_MESSAGE =
  "We couldn't update your preferences. Please try again."

/**
 * WRITE ALLOWLIST. `toSafeProfileInput` rebuilds the object field by field
 * rather than spreading the caller's, so an extra property — whether a stale
 * client attached it, or somebody called the service directly with
 * `{ ...input, admin: true }` — never reaches `setDoc`.
 */
const normalize = toSafeProfileInput

const shouldPublish = (profile: SportsProfile) =>
  profile.onboardingCompleted && profile.preferences.privacy.discoverable

/**
 * Keeps `publicProfiles/{uid}` in step with the private document. Discovery
 * is opt-in: when the user is not discoverable the projection is deleted, so
 * a stale document can never be browsed. UI never writes both documents —
 * this is the only place they are synchronized.
 */
async function syncPublicProfile(profile: SportsProfile) {
  try {
    if (shouldPublish(profile)) {
      await publicProfileRepository.upsert(toDiscoveryProfile(profile))
    } else {
      await publicProfileRepository.remove(profile.id)
    }
  } catch {
    // Best effort: `loadProfile` repairs the projection on the next app open.
  }
}

/** Validate → persist → re-project. Throws a user-safe message. */
async function saveValidated(userId: string, input: SaveProfileInput) {
  const normalized = normalize(input)
  const problem = validateProfileInput(normalized)
  if (problem) throw new Error(problem)

  let saved: SportsProfile
  try {
    saved = await profileRepository.saveProfile(userId, normalized)
  } catch {
    throw new Error(SAVE_FAILED_MESSAGE)
  }

  await syncPublicProfile(saved)
  return saved
}

export const profileService = {
  /**
   * Reads the profile, creating the minimal document if it is missing, then
   * repairs the discovery projection for users who predate it (or whose last
   * sync failed). One extra read per session, no listeners.
   */
  async loadProfile(user: AuthUser): Promise<SportsProfile> {
    const existing = await profileRepository.getByUserId(user.id)
    const profile = existing ?? (await profileRepository.createIfMissing(user))

    try {
      const projection = await publicProfileRepository.getByUserId(profile.id)
      if (shouldPublish(profile) && !projection) await syncPublicProfile(profile)
      if (!shouldPublish(profile) && projection) await syncPublicProfile(profile)
    } catch {
      // Never block sign-in on projection maintenance.
    }

    return profile
  },

  /** First save: also seeds discovery preferences from the profile itself. */
  completeOnboarding(
    userId: string,
    input: SaveProfileInput,
  ): Promise<SportsProfile> {
    if (!isGender(input.gender)) throw new Error('Choose a valid gender.')
    return saveValidated(userId, {
      ...input,
      preferences: createDefaultUserPreferences(input),
    })
  },

  async completeGender(userId: string, gender: Gender) {
    if (!isGender(gender)) throw new Error('Choose a valid gender.')
    const saved = await profileRepository.setGender(userId, gender)
    await syncPublicProfile(saved)
    return saved
  },

  /**
   * Profile editing. Sports filters are left as they are, minus dropped
   * sports; the intent filter always mirrors the edited profile (see
   * `reconcileDiscoveryPreferences`).
   */
  async updateProfile(
    userId: string,
    input: SaveProfileInput,
    preferences: UserPreferences,
  ): Promise<SportsProfile> {
    const { gender: _gender, ...editableInput } = input
    return saveValidated(userId, {
      ...editableInput,
      preferences: reconcileDiscoveryPreferences(
        preferences,
        input.sports,
        input.intents,
      ),
    })
  },

  /** Also re-projects: flipping `discoverable` publishes or deletes it. */
  async updatePreferences(
    userId: string,
    preferences: UserPreferences,
  ): Promise<SportsProfile> {
    let saved: SportsProfile
    try {
      saved = await profileRepository.updatePreferences(userId, preferences)
    } catch {
      throw new Error(PREFERENCES_FAILED_MESSAGE)
    }

    await syncPublicProfile(saved)
    return saved
  },
}

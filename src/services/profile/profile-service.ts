import {
  createDefaultUserPreferences,
  reconcileDiscoveryPreferences,
} from '@/lib/preferences'
import { toDiscoveryProfile } from '@/lib/discovery-profile'
import {
  profileRepository,
  publicProfileRepository,
} from '@/repositories/repositories'
import { validateProfileInput } from '@/services/profile/profile-validation'
import type { AuthUser } from '@/types/auth'
import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'

const SAVE_FAILED_MESSAGE = "We couldn't save your profile. Please try again."
const PREFERENCES_FAILED_MESSAGE =
  "We couldn't update your preferences. Please try again."

const normalize = (input: SaveProfileInput): SaveProfileInput => ({
  ...input,
  displayName: input.displayName.trim(),
  bio: input.bio.trim(),
  // Drop days the user left empty so stored availability stays meaningful.
  availability: input.availability.filter((slot) => slot.periods.length > 0),
})

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
    return saveValidated(userId, {
      ...input,
      preferences: createDefaultUserPreferences(input),
    })
  },

  /** Profile editing. Preferences are left as they are, minus dropped sports. */
  async updateProfile(
    userId: string,
    input: SaveProfileInput,
    preferences: UserPreferences,
  ): Promise<SportsProfile> {
    return saveValidated(userId, {
      ...input,
      preferences: reconcileDiscoveryPreferences(preferences, input.sports),
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

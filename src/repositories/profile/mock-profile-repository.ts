import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { normalizeUserPreferences } from '@/lib/preferences'
import { delay, readStore, writeStore } from '@/repositories/mock-store'
import {
  EMPTY_PROFILE_FIELDS,
  type ProfileRepository,
} from '@/repositories/profile/profile-repository'
import type { AuthUser } from '@/types/auth'
import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'

const readProfiles = () =>
  readStore<SportsProfile[]>(MOCK_STORAGE_KEYS.users, [])

const writeProfiles = (profiles: SportsProfile[]) =>
  writeStore(MOCK_STORAGE_KEYS.users, profiles)

/** Fills in fields that older stored documents may not have. */
function normalize(profile: SportsProfile): SportsProfile {
  const merged = {
    ...EMPTY_PROFILE_FIELDS,
    ...profile,
    sports: profile.sports ?? [],
    intents: profile.intents ?? [],
    availability: profile.availability ?? [],
  }
  return {
    ...merged,
    preferences: normalizeUserPreferences(profile.preferences, merged),
  }
}

export const mockProfileRepository: ProfileRepository = {
  async getByUserId(userId) {
    await delay(null, 150)
    const profile = readProfiles().find((entry) => entry.id === userId)
    return profile ? normalize(profile) : null
  },

  async createIfMissing(user: AuthUser) {
    await delay(null, 150)
    const profiles = readProfiles()
    const existing = profiles.find((entry) => entry.id === user.id)
    if (existing) return normalize(existing)

    const now = new Date().toISOString()
    const profile: SportsProfile = {
      ...EMPTY_PROFILE_FIELDS,
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
      preferences: normalizeUserPreferences(undefined, EMPTY_PROFILE_FIELDS),
    }
    writeProfiles([...profiles, profile])
    return profile
  },

  async saveProfile(userId: string, input: SaveProfileInput) {
    await delay(null, 250)
    const profiles = readProfiles()
    const existing = profiles.find((entry) => entry.id === userId)
    if (!existing) throw new Error(`No profile document for ${userId}.`)

    const saved: SportsProfile = normalize({
      ...existing,
      ...input,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    })
    writeProfiles(profiles.map((entry) => (entry.id === userId ? saved : entry)))
    return saved
  },

  async updatePreferences(userId: string, preferences: UserPreferences) {
    await delay(null, 150)
    const profiles = readProfiles()
    const existing = profiles.find((entry) => entry.id === userId)
    if (!existing) throw new Error(`No profile document for ${userId}.`)

    const saved = normalize({
      ...existing,
      preferences,
      updatedAt: new Date().toISOString(),
    })
    writeProfiles(profiles.map((entry) => (entry.id === userId ? saved : entry)))
    return saved
  },
}

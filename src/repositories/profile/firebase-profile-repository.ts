import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'

import {
  EMPTY_PROFILE_FIELDS,
  type ProfileRepository,
} from '@/repositories/profile/profile-repository'
import { normalizeUserPreferences } from '@/lib/preferences'
import { getFirebaseDb } from '@/services/firebase/client'
import type { UserPreferences } from '@/types/preferences'
import type { AuthUser } from '@/types/auth'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'
import type { Gender } from '@/types/gender'

const COLLECTION = 'users'

const userDoc = (id: string) => doc(getFirebaseDb(), COLLECTION, id)

const toIsoString = (value: unknown): string =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : new Date().toISOString()

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

const asSocialUsername = (value: unknown) =>
  typeof value === 'string' ? value : ''

const asGender = (value: unknown): Gender | null =>
  value === 'male' || value === 'female' ? value : null

/** Tolerates documents written before a field existed (STEP 3/4 users). */
function toSportsProfile(id: string, data: DocumentData): SportsProfile {
  const fields = {
    bio: asString(data.bio),
    instagramUsername: asSocialUsername(data.instagramUsername),
    linkedinUsername: asSocialUsername(data.linkedinUsername),
    sports: Array.isArray(data.sports) ? data.sports : [],
    intents: Array.isArray(data.intents) ? data.intents : [],
    preferredIntensity: data.preferredIntensity ?? null,
    availability: Array.isArray(data.availability) ? data.availability : [],
    area: data.area ?? null,
    radiusKm: typeof data.radiusKm === 'number' ? data.radiusKm : null,
    budget: data.budget && typeof data.budget === 'object' ? data.budget : null,
  }

  return {
    id,
    email: asString(data.email),
    displayName: asString(data.displayName),
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    gender: asGender(data.gender),
    onboardingCompleted: data.onboardingCompleted === true,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    ...fields,
    preferences: normalizeUserPreferences(data.preferences, fields),
  }
}

const fallbackProfile = (user: AuthUser, gender: Gender | null = null): SportsProfile => ({
  ...user,
  ...EMPTY_PROFILE_FIELDS,
  gender,
  onboardingCompleted: false,
  updatedAt: user.createdAt,
  preferences: normalizeUserPreferences(undefined, EMPTY_PROFILE_FIELDS),
})

async function getByUserId(userId: string) {
  const snapshot = await getDoc(userDoc(userId))
  return snapshot.exists() ? toSportsProfile(snapshot.id, snapshot.data()) : null
}

export const firebaseProfileRepository: ProfileRepository = {
  getByUserId,

  async createIfMissing(user: AuthUser, gender: Gender | null = null) {
    const existing = await getByUserId(user.id)
    if (existing) return existing

    // Server timestamps; only ever written when the document is absent.
    await setDoc(userDoc(user.id), {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      gender,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Skip the extra read-after-write round trip: every field just written is
    // already known here, so the fallback shape (used as a contingency below
    // anyway) can be returned directly. The next real load resolves the
    // server timestamps.
    return fallbackProfile(user, gender)
  },

  async setGender(userId: string, gender: Gender) {
    const existing = await getByUserId(userId)
    if (!existing) throw new Error(`No profile document for ${userId}.`)
    if (existing.gender && existing.gender !== gender) throw new Error('Gender cannot be changed after account creation.')
    await setDoc(userDoc(userId), { gender, updatedAt: serverTimestamp() }, { merge: true })
    const saved = await getByUserId(userId)
    if (!saved) throw new Error('Gender was saved but could not be read back.')
    return saved
  },

  async saveProfile(userId: string, input: SaveProfileInput) {
    const existing = await getByUserId(userId)
    if (!existing) throw new Error(`No profile document for ${userId}.`)
    if (existing.gender && input.gender !== undefined && input.gender !== existing.gender) {
      throw new Error('Gender cannot be changed after account creation.')
    }
    // merge keeps email, photoUrl and createdAt from the auth step intact.
    // Fields are listed explicitly rather than spread: the document shape is
    // decided here, so no extra property on `input` can be persisted, and the
    // written keys always match the allowlist in `firestore.rules`.
    await setDoc(
      userDoc(userId),
      {
        displayName: input.displayName,
        bio: input.bio,
        instagramUsername: input.instagramUsername ?? '',
        linkedinUsername: input.linkedinUsername ?? '',
        sports: input.sports,
        intents: input.intents,
        preferredIntensity: input.preferredIntensity,
        availability: input.availability,
        area: input.area,
        radiusKm: input.radiusKm,
        budget: input.budget,
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.preferences ? { preferences: input.preferences } : {}),
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    const saved = await getByUserId(userId)
    if (!saved) throw new Error('Profile was saved but could not be read back.')
    return saved
  },

  async updatePreferences(userId: string, preferences: UserPreferences) {
    await setDoc(
      userDoc(userId),
      { preferences, updatedAt: serverTimestamp() },
      { merge: true },
    )

    const saved = await getByUserId(userId)
    if (!saved) throw new Error('Preferences were saved but could not be read back.')
    return saved
  },
}

import { getProfileCompleteness } from '@/lib/profile-completeness'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'

interface ProjectionMeta {
  userId: string
  photoUrl: string | null
  discoverable: boolean
  updatedAt: string
}

/**
 * THE PRIVACY BOUNDARY. Every field is picked explicitly — the private
 * profile is never spread — so a new private field cannot leak into what
 * other users see. Radius, email, timestamps beyond `updatedAt` and the whole
 * `preferences` object stay behind this line.
 */
function build(
  input: SaveProfileInput,
  meta: ProjectionMeta,
): DiscoveryProfile {
  return {
    userId: meta.userId,
    displayName: input.displayName,
    gender: profileGender(input.gender),
    photoUrl: meta.photoUrl,
    bio: input.bio,
    sports: input.sports,
    intents: input.intents,
    preferredIntensity: input.preferredIntensity,
    availability: input.availability,
    area: input.area,
    budget: input.budget,
    profileCompleteness: getProfileCompleteness(input).percent,
    discoverable: meta.discoverable,
    updatedAt: meta.updatedAt,
  }
}

const profileGender = (gender: SaveProfileInput['gender']) =>
  gender === 'male' || gender === 'female' ? gender : null

/** Stored private profile → discovery-safe projection. */
export function toDiscoveryProfile(profile: SportsProfile): DiscoveryProfile {
  return build(profile, {
    userId: profile.id,
    photoUrl: profile.photoUrl,
    discoverable: profile.preferences.privacy.discoverable,
    updatedAt: profile.updatedAt,
  })
}

/** In-progress onboarding draft → preview of the same projection. */
export function draftToDiscoveryProfile(
  input: SaveProfileInput,
  meta: { userId: string; photoUrl: string | null },
): DiscoveryProfile {
  return build(input, {
    ...meta,
    discoverable: true,
    updatedAt: new Date().toISOString(),
  })
}

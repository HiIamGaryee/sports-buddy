import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import type { DiscoveryProfile } from '@/types/discovery-profile'

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

const asGender = (value: unknown) =>
  value === 'male' || value === 'female' ? value : null

const toIsoString = (value: unknown): string =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : new Date(0).toISOString()

/** Firestore document → domain projection, tolerant of missing fields. */
export function toDiscoveryProfileDocument(
  id: string,
  data: DocumentData,
): DiscoveryProfile {
  return {
    userId: asString(data.userId, id),
    displayName: asString(data.displayName),
    gender: asGender(data.gender),
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    bio: asString(data.bio),
    instagramUsername: asString(data.instagramUsername),
    linkedinUsername: asString(data.linkedinUsername),
    sports: Array.isArray(data.sports) ? data.sports : [],
    intents: Array.isArray(data.intents) ? data.intents : [],
    preferredIntensity: data.preferredIntensity ?? null,
    availability: Array.isArray(data.availability) ? data.availability : [],
    area: data.area ?? null,
    budget: data.budget && typeof data.budget === 'object' ? data.budget : null,
    profileCompleteness:
      typeof data.profileCompleteness === 'number' ? data.profileCompleteness : 0,
    discoverable: data.discoverable !== false,
    updatedAt: toIsoString(data.updatedAt),
  }
}

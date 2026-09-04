import type { DiscoveryProfile } from '@/types/discovery-profile'

/**
 * WRITE side of `publicProfiles/{uid}` — the discovery-safe projection of a
 * private profile. Only ever called by the profile service, never by UI.
 */
export interface PublicProfileRepository {
  getByUserId(userId: string): Promise<DiscoveryProfile | null>
  upsert(profile: DiscoveryProfile): Promise<void>
  remove(userId: string): Promise<void>
}

export const PUBLIC_PROFILES_COLLECTION = 'publicProfiles'

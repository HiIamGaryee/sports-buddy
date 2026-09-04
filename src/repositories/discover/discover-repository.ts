import type { DiscoveryProfile } from '@/types/discovery-profile'

/**
 * READ side of `publicProfiles` — Discover never touches `users/{uid}`.
 * Kept separate from PublicProfileRepository: reads are for browsing other
 * people, writes are only ever a user's own projection.
 */
export interface DiscoverRepository {
  /** One limited batch, newest projections first. No realtime listeners. */
  getCandidates(limit: number): Promise<DiscoveryProfile[]>
  getProfileById(userId: string): Promise<DiscoveryProfile | null>
}

/** MVP batch size — see docs/discover.md for the pagination plan. */
export const CANDIDATE_BATCH_LIMIT = 30

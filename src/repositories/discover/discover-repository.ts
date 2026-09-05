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
  /**
   * Batched lookup for a known set of ids — used by Messages to show a name
   * and avatar per connected buddy. It exists so that surface never does one
   * read per row (and never reads `users/{uid}`). Missing ids are simply
   * absent from the result.
   */
  getProfilesByIds(userIds: readonly string[]): Promise<DiscoveryProfile[]>
}

/** MVP batch size — see docs/discover.md for the pagination plan. */
export const CANDIDATE_BATCH_LIMIT = 30

/** Firestore's ceiling for an `in` filter, so id lookups are chunked. */
export const PROFILE_ID_QUERY_LIMIT = 30

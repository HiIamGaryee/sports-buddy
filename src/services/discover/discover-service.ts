import { matchesFilters } from '@/lib/discover-filters'
import { CANDIDATE_BATCH_LIMIT } from '@/repositories/discover/discover-repository'
import { discoverRepository } from '@/repositories/repositories'
import type { CandidateQuery } from '@/types/discover'
import type { DiscoveryProfile } from '@/types/discovery-profile'

const LOAD_FAILED_MESSAGE = "We couldn't load sports buddies."

/**
 * Reads only the discovery-safe projection. Candidate exclusion lives here,
 * not in the UI. Ranking is deliberately basic until STEP 7.
 */
export const discoverService = {
  async loadCandidates(currentUserId: string): Promise<DiscoveryProfile[]> {
    try {
      const candidates = await discoverRepository.getCandidates(
        CANDIDATE_BATCH_LIMIT,
      )
      return candidates
        .filter(
          (candidate) =>
            candidate.userId !== currentUserId && candidate.discoverable,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } catch {
      throw new Error(LOAD_FAILED_MESSAGE)
    }
  },

  /** Pure, so changing a filter never triggers another backend read. */
  applyFilters(
    candidates: DiscoveryProfile[],
    query: CandidateQuery,
  ): DiscoveryProfile[] {
    return candidates.filter((candidate) => matchesFilters(candidate, query))
  },

  async getCandidate(userId: string): Promise<DiscoveryProfile | null> {
    try {
      const profile = await discoverRepository.getProfileById(userId)
      return profile?.discoverable ? profile : null
    } catch {
      throw new Error(LOAD_FAILED_MESSAGE)
    }
  },
}

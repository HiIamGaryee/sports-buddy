import { isVisibleCandidate, matchesFilters } from '@/lib/discover-filters'
import { CANDIDATE_BATCH_LIMIT } from '@/repositories/discover/discover-repository'
import { discoverRepository } from '@/repositories/repositories'
import {
  calculateCompatibility,
  rankBuddies,
} from '@/services/matching/matching-service'
import type { CandidateQuery } from '@/types/discover'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { MatchingSubject, RankedBuddy } from '@/types/matching'

const LOAD_FAILED_MESSAGE = "We couldn't load sports buddies."

/**
 * Reads only the discovery-safe projection. The repository retrieves data,
 * this service owns the rules: hard exclusions, then active filters, then
 * compatibility ranking. Scores are derived per viewer and never persisted.
 */
export const discoverService = {
  async loadCandidates(currentUserId: string): Promise<DiscoveryProfile[]> {
    try {
      const candidates = await discoverRepository.getCandidates(
        CANDIDATE_BATCH_LIMIT,
      )
      // Hard exclusions — the signed-in user and anyone not discoverable.
      return candidates.filter((candidate) =>
        isVisibleCandidate(candidate, currentUserId),
      )
    } catch {
      throw new Error(LOAD_FAILED_MESSAGE)
    }
  },

  /**
   * Pure, so changing a filter never triggers another backend read. Filters
   * are hard and run FIRST — an excluded candidate is never scored — then the
   * survivors are ranked by compatibility.
   */
  getRankedCandidates(
    candidates: readonly DiscoveryProfile[],
    query: CandidateQuery,
    subject: MatchingSubject,
  ): RankedBuddy[] {
    return rankBuddies(
      candidates.filter((candidate) => matchesFilters(candidate, query)),
      subject,
    )
  },

  async getCandidate(userId: string): Promise<DiscoveryProfile | null> {
    try {
      const profile = await discoverRepository.getProfileById(userId)
      return profile?.discoverable ? profile : null
    } catch {
      throw new Error(LOAD_FAILED_MESSAGE)
    }
  },

  /** One candidate plus the viewer's compatibility with them. */
  rankCandidate(
    candidate: DiscoveryProfile,
    subject: MatchingSubject,
  ): RankedBuddy {
    return {
      profile: candidate,
      compatibility: calculateCompatibility(subject, candidate),
    }
  },
}

import type { DiscoverRepository } from '@/repositories/discover/discover-repository'
import { MOCK_CANDIDATES } from '@/repositories/discover/mock-candidates'
import { delay } from '@/repositories/mock-store'
import { readMockPublicProfiles } from '@/repositories/public-profile/mock-public-profile-repository'
import type { DiscoveryProfile } from '@/types/discovery-profile'

/** Seeded people plus any projection written by a real (mock) account. */
function allProfiles(): DiscoveryProfile[] {
  const stored = readMockPublicProfiles()
  const storedIds = stored.map((entry) => entry.userId)
  return [
    ...stored,
    ...MOCK_CANDIDATES.filter(
      (candidate) => !storedIds.includes(candidate.userId),
    ).map((candidate) => structuredClone<DiscoveryProfile>(candidate)),
  ]
}

export const mockDiscoverRepository: DiscoverRepository = {
  async getCandidates(limit: number) {
    await delay(null, 400)
    return allProfiles()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
  },

  async getProfileById(userId: string) {
    await delay(null, 250)
    return allProfiles().find((entry) => entry.userId === userId) ?? null
  },

  async getProfilesByIds(userIds: readonly string[]) {
    if (userIds.length === 0) return []
    await delay(null, 150)
    return allProfiles().filter((entry) => userIds.includes(entry.userId))
  },
}

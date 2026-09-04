import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { delay, readStore, writeStore } from '@/repositories/mock-store'
import type { PublicProfileRepository } from '@/repositories/public-profile/public-profile-repository'
import type { DiscoveryProfile } from '@/types/discovery-profile'

export const readMockPublicProfiles = () =>
  readStore<DiscoveryProfile[]>(MOCK_STORAGE_KEYS.publicProfiles, [])

export const mockPublicProfileRepository: PublicProfileRepository = {
  async getByUserId(userId) {
    await delay(null, 100)
    return readMockPublicProfiles().find((p) => p.userId === userId) ?? null
  },

  async upsert(profile: DiscoveryProfile) {
    await delay(null, 100)
    const others = readMockPublicProfiles().filter(
      (entry) => entry.userId !== profile.userId,
    )
    writeStore(MOCK_STORAGE_KEYS.publicProfiles, [...others, profile])
  },

  async remove(userId: string) {
    await delay(null, 100)
    writeStore(
      MOCK_STORAGE_KEYS.publicProfiles,
      readMockPublicProfiles().filter((entry) => entry.userId !== userId),
    )
  },
}

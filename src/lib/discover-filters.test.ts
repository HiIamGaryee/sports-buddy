import { describe, expect, it } from 'vitest'

import { isVisibleCandidate, matchesFilters } from '@/lib/discover-filters'
import type { DiscoverFilters } from '@/types/discover'
import type { DiscoveryProfile } from '@/types/discovery-profile'

const candidate = (
  overrides: Partial<DiscoveryProfile> = {},
): DiscoveryProfile => ({
  userId: 'buddy_test',
  displayName: 'Test Buddy',
  photoUrl: null,
  bio: '',
  sports: [{ sportId: 'badminton', skillLevel: 'intermediate' }],
  intents: ['casual'],
  preferredIntensity: 'moderate',
  availability: [{ day: 'saturday', periods: ['evening'] }],
  area: 'subang-jaya',
  budget: { min: 20, max: 40 },
  profileCompleteness: 100,
  discoverable: true,
  updatedAt: '2026-08-30T09:00:00.000Z',
  ...overrides,
})

const filters = (overrides: Partial<DiscoverFilters> = {}): DiscoverFilters => ({
  sports: [],
  skillLevels: [],
  intents: [],
  areas: [],
  requireAvailabilityOverlap: false,
  ...overrides,
})

describe('hard exclusions', () => {
  it('excludes the signed-in user', () => {
    expect(isVisibleCandidate(candidate({ userId: 'me' }), 'me')).toBe(false)
    expect(isVisibleCandidate(candidate({ userId: 'them' }), 'me')).toBe(true)
  })

  it('excludes a profile that is not discoverable', () => {
    expect(isVisibleCandidate(candidate({ discoverable: false }), 'me')).toBe(
      false,
    )
  })
})

describe('hard filters', () => {
  const query = (overrides: Partial<DiscoverFilters> = {}) => ({
    filters: filters(overrides),
    availability: [{ day: 'saturday' as const, periods: ['evening' as const] }],
  })

  it('keeps everyone when nothing is selected', () => {
    expect(matchesFilters(candidate(), query())).toBe(true)
  })

  it('excludes a candidate outside the availability requirement', () => {
    expect(
      matchesFilters(
        candidate({ availability: [{ day: 'monday', periods: ['morning'] }] }),
        query({ requireAvailabilityOverlap: true }),
      ),
    ).toBe(false)
  })

  it('requires one sport to satisfy sport and skill at once', () => {
    const mixed = candidate({
      sports: [
        { sportId: 'badminton', skillLevel: 'beginner' },
        { sportId: 'climbing', skillLevel: 'advanced' },
      ],
    })
    expect(
      matchesFilters(
        mixed,
        query({ sports: ['badminton'], skillLevels: ['advanced'] }),
      ),
    ).toBe(false)
  })
})

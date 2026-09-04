import { describe, expect, it } from 'vitest'

import {
  COMPATIBILITY_WEIGHTS,
  MATCHING_FACTOR_KEYS,
  MAX_COMPATIBILITY_SCORE,
} from '@/services/matching/matching-constants'
import {
  calculateAvailabilityCompatibility,
  calculateBudgetCompatibility,
  calculateLocationCompatibility,
  calculateSkillCompatibility,
  calculateSportCompatibility,
  getBestSportMatch,
} from '@/services/matching/matching-factors'
import {
  calculateCompatibility,
  getCompatibilityLabel,
  getTopMatchingReasons,
  rankBuddies,
} from '@/services/matching/matching-service'
import type { DiscoveryProfile } from '@/types/discovery-profile'
import type { MatchingSubject } from '@/types/matching'

/** Small typed fixtures — every test overrides only what it is about. */
const subject = (overrides: Partial<MatchingSubject> = {}): MatchingSubject => ({
  sports: [
    { sportId: 'badminton', skillLevel: 'intermediate' },
    { sportId: 'climbing', skillLevel: 'beginner' },
  ],
  availability: [{ day: 'saturday', periods: ['afternoon', 'evening'] }],
  area: 'subang-jaya',
  budget: { min: 20, max: 40 },
  preferredSports: ['badminton', 'climbing'],
  ...overrides,
})

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

describe('weights', () => {
  it('total the maximum score', () => {
    const total = MATCHING_FACTOR_KEYS.reduce(
      (sum, key) => sum + COMPATIBILITY_WEIGHTS[key],
      0,
    )
    expect(total).toBe(MAX_COMPATIBILITY_SCORE)
  })
})

describe('sport compatibility', () => {
  it('scores nothing without a shared sport', () => {
    const outcome = calculateSportCompatibility(
      subject(),
      candidate({ sports: [{ sportId: 'futsal', skillLevel: 'casual' }] }),
    )
    expect(outcome.normalizedScore).toBe(0)
    expect(outcome.matched).toBe(false)
    expect(outcome.reason).toBeNull()
  })

  it('rewards extra overlap above a single shared sport', () => {
    const one = calculateSportCompatibility(subject(), candidate())
    const two = calculateSportCompatibility(
      subject(),
      candidate({
        sports: [
          { sportId: 'badminton', skillLevel: 'intermediate' },
          { sportId: 'climbing', skillLevel: 'beginner' },
        ],
      }),
    )
    expect(one.normalizedScore).toBeGreaterThan(0)
    expect(two.normalizedScore).toBeGreaterThan(one.normalizedScore)
  })

  it('is not penalised for playing many unrelated sports', () => {
    const many = subject({
      sports: [
        { sportId: 'badminton', skillLevel: 'intermediate' },
        { sportId: 'gym', skillLevel: 'casual' },
        { sportId: 'tennis', skillLevel: 'casual' },
        { sportId: 'running', skillLevel: 'casual' },
      ],
      preferredSports: [],
    })
    expect(
      calculateSportCompatibility(many, candidate()).normalizedScore,
    ).toBe(calculateSportCompatibility(subject(), candidate()).normalizedScore)
  })

  it('scores a shared sport lower when it is not a preferred sport', () => {
    const preferred = calculateSportCompatibility(subject(), candidate())
    const notPreferred = calculateSportCompatibility(
      subject({ preferredSports: ['climbing'] }),
      candidate(),
    )
    expect(notPreferred.normalizedScore).toBeLessThan(
      preferred.normalizedScore,
    )
    expect(notPreferred.normalizedScore).toBeGreaterThan(0)
  })

  it('picks the best shared sport by skill compatibility', () => {
    expect(
      getBestSportMatch(
        subject({ preferredSports: [] }),
        candidate({
          sports: [
            { sportId: 'badminton', skillLevel: 'advanced' },
            { sportId: 'climbing', skillLevel: 'beginner' },
          ],
        }),
      ),
    ).toBe('climbing')
  })
})

describe('skill compatibility', () => {
  const skillScore = (
    mine: 'beginner' | 'casual' | 'intermediate' | 'advanced',
    theirs: typeof mine,
  ) =>
    calculateSkillCompatibility(
      subject({
        sports: [{ sportId: 'badminton', skillLevel: mine }],
        preferredSports: ['badminton'],
      }),
      candidate({ sports: [{ sportId: 'badminton', skillLevel: theirs }] }),
    ).normalizedScore

  it('is maximal at the same level', () => {
    expect(skillScore('intermediate', 'intermediate')).toBe(1)
  })

  it('falls off with each level of difference', () => {
    expect(skillScore('intermediate', 'advanced')).toBeLessThan(1)
    expect(skillScore('intermediate', 'beginner')).toBeLessThan(
      skillScore('intermediate', 'advanced'),
    )
    expect(skillScore('beginner', 'advanced')).toBeLessThan(
      skillScore('intermediate', 'beginner'),
    )
  })

  it('compares levels by rank, not alphabetically', () => {
    // 'advanced' < 'beginner' as strings, but is three ranks apart.
    expect(skillScore('advanced', 'beginner')).toBeLessThan(
      skillScore('advanced', 'intermediate'),
    )
  })

  it('scores nothing without a shared sport', () => {
    const outcome = calculateSkillCompatibility(
      subject(),
      candidate({ sports: [{ sportId: 'futsal', skillLevel: 'advanced' }] }),
    )
    expect(outcome.normalizedScore).toBe(0)
    expect(outcome.reason).toBeNull()
  })
})

describe('availability compatibility', () => {
  it('credits a single shared slot and names it', () => {
    const outcome = calculateAvailabilityCompatibility(subject(), candidate())
    expect(outcome.normalizedScore).toBeGreaterThan(0)
    expect(outcome.reason).toBe('Both free Saturday evening')
  })

  it('scores more shared slots higher', () => {
    const more = calculateAvailabilityCompatibility(
      subject(),
      candidate({
        availability: [{ day: 'saturday', periods: ['afternoon', 'evening'] }],
      }),
    )
    expect(more.normalizedScore).toBeGreaterThan(
      calculateAvailabilityCompatibility(subject(), candidate())
        .normalizedScore,
    )
  })

  it('scores nothing without an overlap', () => {
    const outcome = calculateAvailabilityCompatibility(
      subject(),
      candidate({ availability: [{ day: 'monday', periods: ['morning'] }] }),
    )
    expect(outcome.normalizedScore).toBe(0)
    expect(outcome.reason).toBeNull()
  })
})

describe('location compatibility (approximate area only)', () => {
  it('is maximal in the same area', () => {
    const outcome = calculateLocationCompatibility(subject(), candidate())
    expect(outcome.normalizedScore).toBe(1)
    expect(outcome.reason).toBe('Both in Subang Jaya')
  })

  it('ranks same region above a different region', () => {
    const region = calculateLocationCompatibility(
      subject(),
      candidate({ area: 'petaling-jaya' }),
    )
    const elsewhere = calculateLocationCompatibility(
      subject(),
      candidate({ area: 'cheras' }),
    )
    expect(region.normalizedScore).toBeLessThan(1)
    expect(elsewhere.normalizedScore).toBeLessThan(region.normalizedScore)
  })

  it('never claims a distance', () => {
    const details = [
      calculateLocationCompatibility(subject(), candidate()),
      calculateLocationCompatibility(subject(), candidate({ area: 'cheras' })),
      calculateLocationCompatibility(subject(), candidate({ area: null })),
    ].flatMap((outcome) => [outcome.detail, outcome.reason ?? ''])
    expect(details.join(' ')).not.toMatch(/km/i)
  })

  it('scores nothing when either area is missing', () => {
    expect(
      calculateLocationCompatibility(subject(), candidate({ area: null }))
        .normalizedScore,
    ).toBe(0)
  })
})

describe('budget compatibility', () => {
  const budgetScore = (
    mine: { min: number; max: number | null } | null,
    theirs: typeof mine,
  ) =>
    calculateBudgetCompatibility({ budget: mine }, { budget: theirs })
      .normalizedScore

  it('is maximal on a real overlap', () => {
    expect(budgetScore({ min: 20, max: 40 }, { min: 30, max: 60 })).toBe(1)
  })

  it('gives partial credit to touching ranges', () => {
    const touching = budgetScore({ min: 20, max: 40 }, { min: 40, max: 60 })
    expect(touching).toBeGreaterThan(0)
    expect(touching).toBeLessThan(1)
  })

  it('gives less to a small gap and nothing to a large one', () => {
    const near = budgetScore({ min: 20, max: 40 }, { min: 50, max: 60 })
    expect(near).toBeGreaterThan(0)
    expect(near).toBeLessThan(
      budgetScore({ min: 20, max: 40 }, { min: 40, max: 60 }),
    )
    expect(budgetScore({ min: 10, max: 20 }, { min: 40, max: 60 })).toBe(0)
  })

  it('handles open-ended budgets without breaking arithmetic', () => {
    expect(budgetScore({ min: 20, max: 40 }, { min: 0, max: null })).toBe(1)
    expect(budgetScore({ min: 60, max: null }, { min: 20, max: 40 })).toBe(0)
    expect(
      calculateBudgetCompatibility(
        { budget: { min: 60, max: null } },
        { budget: { min: 0, max: null } },
      ).detail,
    ).toBe('Shared budget RM60+')
  })

  it('scores nothing when either budget is missing', () => {
    expect(budgetScore(null, { min: 20, max: 40 })).toBe(0)
    expect(budgetScore({ min: 20, max: 40 }, null)).toBe(0)
  })
})

describe('overall compatibility', () => {
  it('scores an identical profile very highly', () => {
    const me = subject()
    const twin = candidate({
      sports: me.sports,
      availability: me.availability,
      area: me.area,
      budget: me.budget,
    })
    const result = calculateCompatibility(me, twin)
    // Not 100: a perfect 35/35 and 20/20 need three shared sports and three
    // shared slots, which two people rarely have. See docs/matching.md.
    expect(result.score).toBeGreaterThanOrEqual(90)
    expect(result.label).toBe('Excellent fit')
  })

  it('stays inside 0–100 for the worst and best cases', () => {
    const worst = calculateCompatibility(
      subject(),
      candidate({
        sports: [{ sportId: 'futsal', skillLevel: 'advanced' }],
        availability: [],
        area: null,
        budget: null,
      }),
    )
    expect(worst.score).toBe(0)

    const best = calculateCompatibility(
      subject({ preferredSports: [] }),
      candidate({
        sports: [
          { sportId: 'badminton', skillLevel: 'intermediate' },
          { sportId: 'climbing', skillLevel: 'beginner' },
        ],
        availability: [{ day: 'saturday', periods: ['afternoon', 'evening'] }],
      }),
    )
    expect(best.score).toBeLessThanOrEqual(MAX_COMPATIBILITY_SCORE)
    expect(best.score).toBeGreaterThan(worst.score)
  })

  it('is deterministic', () => {
    const runs = [1, 2, 3].map(
      () => calculateCompatibility(subject(), candidate()).score,
    )
    expect(new Set(runs).size).toBe(1)
    expect(getTopMatchingReasons(calculateCompatibility(subject(), candidate()))).toEqual(
      getTopMatchingReasons(calculateCompatibility(subject(), candidate())),
    )
  })

  it('adds the factor breakdown up to the headline score', () => {
    const result = calculateCompatibility(subject(), candidate())
    const weighted = MATCHING_FACTOR_KEYS.reduce(
      (sum, key) =>
        sum +
        result.factors[key].normalizedScore * result.factors[key].maxScore,
      0,
    )
    expect(result.score).toBe(Math.round(weighted))
  })

  it('does not crash on an incomplete candidate document', () => {
    const result = calculateCompatibility(
      subject(),
      candidate({ sports: [], availability: [], area: null, budget: null }),
    )
    expect(result.score).toBe(0)
    expect(result.reasons).toEqual([])
    expect(result.bestSportMatch).toBeNull()
  })

  it('produces reasons that correspond to matched factors only', () => {
    const result = calculateCompatibility(
      subject(),
      candidate({ area: 'cheras', budget: { min: 10, max: 20 } }),
    )
    for (const reason of result.reasons) {
      expect(result.factors[reason.type].matched).toBe(true)
      expect(reason.strength).toBe(result.factors[reason.type].normalizedScore)
    }
    expect(result.reasons.map((reason) => reason.type)).not.toContain('location')
  })

  it('labels bands from the score alone', () => {
    expect(getCompatibilityLabel(95)).toBe('Excellent fit')
    expect(getCompatibilityLabel(80)).toBe('Great fit')
    expect(getCompatibilityLabel(65)).toBe('Good fit')
    expect(getCompatibilityLabel(45)).toBe('Possible fit')
    expect(getCompatibilityLabel(10)).toBe('Low fit')
  })

  it('does not repeat the sport when only one sport is shared', () => {
    const result = calculateCompatibility(subject(), candidate())
    expect(result.sharedSports).toEqual(['badminton'])
    expect(result.reasons.map((reason) => reason.type)).not.toContain('sports')
    expect(result.reasons.map((reason) => reason.text)).toContain(
      'Same badminton level',
    )
  })

  it('leads with the shared sport ahead of a lighter perfect factor', () => {
    const result = calculateCompatibility(
      subject(),
      candidate({
        sports: [
          { sportId: 'badminton', skillLevel: 'beginner' },
          { sportId: 'climbing', skillLevel: 'advanced' },
        ],
      }),
    )
    // Budget is a perfect 10/10 but sports is worth 35 — sports comes first.
    expect(result.factors.budget.normalizedScore).toBe(1)
    expect(getTopMatchingReasons(result)[0].type).toBe('sports')
  })

  it('returns at most the requested number of reasons, strongest first', () => {
    const result = calculateCompatibility(subject(), candidate())
    const top = getTopMatchingReasons(result, 2)
    expect(top).toHaveLength(2)
    expect(top.length).toBeLessThanOrEqual(result.reasons.length)
  })
})

describe('ranking', () => {
  const strong = candidate({ userId: 'strong', displayName: 'Strong' })
  const weak = candidate({
    userId: 'weak',
    displayName: 'Weak',
    sports: [{ sportId: 'futsal', skillLevel: 'advanced' }],
    availability: [{ day: 'monday', periods: ['morning'] }],
    area: 'kepong',
    budget: { min: 0, max: 10 },
  })

  it('sorts the highest score first', () => {
    expect(
      rankBuddies([weak, strong], subject()).map((buddy) => buddy.profile.userId),
    ).toEqual(['strong', 'weak'])
  })

  it('keeps low scores in the feed — ranking is not filtering', () => {
    expect(rankBuddies([weak, strong], subject())).toHaveLength(2)
  })

  it('breaks ties predictably by name, not by input order', () => {
    const bea = candidate({ userId: 'b', displayName: 'Bea' })
    const abu = candidate({ userId: 'a', displayName: 'Abu' })
    expect(
      rankBuddies([bea, abu], subject()).map((buddy) => buddy.profile.displayName),
    ).toEqual(['Abu', 'Bea'])
    expect(
      rankBuddies([abu, bea], subject()).map((buddy) => buddy.profile.displayName),
    ).toEqual(['Abu', 'Bea'])
  })

  it('never mutates the candidate projection', () => {
    const [ranked] = rankBuddies([strong], subject())
    expect(ranked.profile).toBe(strong)
    expect(Object.keys(strong)).not.toContain('compatibility')
  })
})

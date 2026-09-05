import { describe, expect, it } from 'vitest'

import {
  isActivityIntensity,
  isAreaId,
  isRadiusKm,
  isSkillLevel,
  isSportId,
  isSportsIntent,
  isValidAvailability,
  isValidBudget,
  isValidIntents,
  isValidSports,
  toSafeProfileInput,
} from '@/services/profile/profile-schema'
import type { SaveProfileInput } from '@/types/sports-profile'

const VALID: SaveProfileInput = {
  displayName: 'Gary',
  bio: 'Weeknight badminton.',
  sports: [{ sportId: 'badminton', skillLevel: 'intermediate' }],
  intents: ['casual'],
  preferredIntensity: 'moderate',
  availability: [{ day: 'tuesday', periods: ['evening'] }],
  area: 'subang-jaya',
  radiusKm: 15,
  budget: { min: 20, max: 40 },
}

describe('enum membership', () => {
  it('accepts only ids that exist in the centralized datasets', () => {
    expect(isSportId('badminton')).toBe(true)
    expect(isSportId('quidditch')).toBe(false)
    expect(isSportId('')).toBe(false)
    expect(isSportId(null)).toBe(false)

    expect(isSkillLevel('advanced')).toBe(true)
    expect(isSkillLevel('god')).toBe(false)

    expect(isSportsIntent('training')).toBe(true)
    expect(isSportsIntent('dating')).toBe(false)

    expect(isActivityIntensity('high')).toBe(true)
    expect(isActivityIntensity('extreme')).toBe(false)

    expect(isAreaId('subang-jaya')).toBe(true)
    expect(isAreaId('atlantis')).toBe(false)
    expect(isAreaId('SUBANG-JAYA')).toBe(false)
  })

  it('rejects a prototype key masquerading as an enum value', () => {
    expect(isSportId('__proto__')).toBe(false)
    expect(isSportId('constructor')).toBe(false)
    expect(isAreaId('toString')).toBe(false)
  })

  it('accepts only the offered radius values', () => {
    expect(isRadiusKm(15)).toBe(true)
    expect(isRadiusKm(999)).toBe(false)
    expect(isRadiusKm(Number.NaN)).toBe(false)
    expect(isRadiusKm('15')).toBe(false)
  })
})

describe('isValidBudget', () => {
  it('accepts a real range and an open-ended floor', () => {
    expect(isValidBudget({ min: 20, max: 40 })).toBe(true)
    expect(isValidBudget({ min: 60, max: null })).toBe(true)
    expect(isValidBudget({ min: 0, max: 0 })).toBe(true)
  })

  it('rejects non-finite numbers', () => {
    expect(isValidBudget({ min: Number.NaN, max: 40 })).toBe(false)
    expect(isValidBudget({ min: 20, max: Number.NaN })).toBe(false)
    expect(isValidBudget({ min: 20, max: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isValidBudget({ min: Number.NEGATIVE_INFINITY, max: 40 })).toBe(false)
  })

  it('rejects negatives, inverted ranges and absurd amounts', () => {
    expect(isValidBudget({ min: -500, max: 40 })).toBe(false)
    expect(isValidBudget({ min: 40, max: 20 })).toBe(false)
    expect(isValidBudget({ min: 0, max: 1_000_000 })).toBe(false)
  })

  it('rejects strings that merely look numeric', () => {
    expect(isValidBudget({ min: '20', max: '40' })).toBe(false)
    expect(isValidBudget({ min: '20 OR 1=1', max: null })).toBe(false)
    expect(isValidBudget(null)).toBe(false)
    expect(isValidBudget('cheap')).toBe(false)
  })
})

describe('array validation', () => {
  it('rejects unknown members, duplicates and oversized arrays', () => {
    expect(isValidSports([{ sportId: 'badminton', skillLevel: 'casual' }])).toBe(true)
    expect(isValidSports([{ sportId: 'quidditch', skillLevel: 'casual' }])).toBe(false)
    expect(isValidSports([{ sportId: 'badminton', skillLevel: 'wizard' }])).toBe(false)
    expect(
      isValidSports([
        { sportId: 'badminton', skillLevel: 'casual' },
        { sportId: 'badminton', skillLevel: 'advanced' },
      ]),
    ).toBe(false)
    expect(isValidSports([])).toBe(false)
    expect(
      isValidSports(
        Array.from({ length: 9 }, () => ({
          sportId: 'badminton',
          skillLevel: 'casual',
        })),
      ),
    ).toBe(false)
    expect(isValidSports('badminton')).toBe(false)
  })

  it('rejects duplicate intents and duplicate availability days', () => {
    expect(isValidIntents(['casual', 'casual'])).toBe(false)
    expect(isValidIntents(['casual', 'social'])).toBe(true)
    expect(
      isValidAvailability([
        { day: 'monday', periods: ['evening'] },
        { day: 'monday', periods: ['morning'] },
      ]),
    ).toBe(false)
    expect(
      isValidAvailability([{ day: 'monday', periods: ['evening', 'evening'] }]),
    ).toBe(false)
    expect(isValidAvailability([{ day: 'caturday', periods: [] }])).toBe(false)
  })
})

describe('toSafeProfileInput write allowlist', () => {
  it('drops any field that is not part of the profile', () => {
    const hostile = {
      ...VALID,
      admin: true,
      role: 'owner',
      email: 'victim@example.com',
      id: 'someone-else',
    } as unknown as SaveProfileInput

    const safe = toSafeProfileInput(hostile)

    expect(safe).not.toHaveProperty('admin')
    expect(safe).not.toHaveProperty('role')
    expect(safe).not.toHaveProperty('email')
    expect(safe).not.toHaveProperty('id')
    expect(safe.displayName).toBe('Gary')
  })

  it('does not let a prototype key reach the persisted object', () => {
    const parsed = JSON.parse(
      '{"displayName":"Gary","bio":"","sports":[],"intents":[],' +
        '"preferredIntensity":null,"availability":[],"area":null,' +
        '"radiusKm":null,"budget":null,"__proto__":{"admin":true}}',
    ) as SaveProfileInput

    const safe = toSafeProfileInput(parsed)

    expect(Object.keys(safe)).not.toContain('__proto__')
    expect(({} as Record<string, unknown>).admin).toBeUndefined()
  })

  it('replaces unknown enum values with null rather than persisting them', () => {
    const safe = toSafeProfileInput({
      ...VALID,
      preferredIntensity: 'extreme',
      area: 'atlantis',
      radiusKm: 9999,
      budget: { min: Number.NaN, max: null },
    } as unknown as SaveProfileInput)

    expect(safe.preferredIntensity).toBeNull()
    expect(safe.area).toBeNull()
    expect(safe.radiusKm).toBeNull()
    expect(safe.budget).toBeNull()
  })

  it('keeps hostile-looking text as text - it is data, not markup', () => {
    const safe = toSafeProfileInput({
      ...VALID,
      displayName: '<script>alert(1)</script>',
      bio: "' OR 1=1 --",
    })

    expect(safe.displayName).toBe('<script>alert(1)</script>')
    expect(safe.bio).toBe("' OR 1=1 --")
  })

  it('does not truncate authored text - validation reports the length', () => {
    const safe = toSafeProfileInput({ ...VALID, displayName: 'a'.repeat(200) })
    expect(safe.displayName).toHaveLength(200)
  })
})

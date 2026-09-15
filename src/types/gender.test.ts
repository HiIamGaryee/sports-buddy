import { describe, expect, it } from 'vitest'

import { formatGender, isGender } from '@/types/gender'

describe('gender domain values', () => {
  it('accepts only canonical values', () => {
    expect(isGender('male')).toBe(true)
    expect(isGender('female')).toBe(true)
    expect(isGender('')).toBe(false)
    expect(isGender('Male')).toBe(false)
    expect(isGender('FEMALE')).toBe(false)
    expect(isGender('other')).toBe(false)
    expect(isGender('<script>')).toBe(false)
    expect(isGender(null)).toBe(false)
  })

  it('formats canonical values and safely hides legacy values', () => {
    expect(formatGender('male')).toBe('Male')
    expect(formatGender('female')).toBe('Female')
    expect(formatGender(null)).toBe('')
    expect(formatGender('Male' as never)).toBe('')
  })
})

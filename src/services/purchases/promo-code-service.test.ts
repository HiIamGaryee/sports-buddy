import { beforeEach, describe, expect, it, vi } from 'vitest'

import { promoCodeService } from '@/services/purchases/promo-code-service'

// Mock mode: the demo code lists stand in for the `promoCodes` collection.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
})

describe('promoCodeService (mock backend)', () => {
  beforeEach(() => store.clear())

  it('lets any number of accounts redeem a reusable referral code', async () => {
    for (const user of ['alex', 'ben', 'chen']) {
      await promoCodeService.redeem(user, ' buddy-cem2-w8my ')
      expect(await promoCodeService.hasRedemption(user)).toBe(true)
    }
  })

  it('counts a reusable code once per account', async () => {
    await promoCodeService.redeem('alex', 'BUDDY-CEM2-W8MY')
    await expect(promoCodeService.redeem('alex', 'BUDDY-CEM2-W8MY')).rejects.toThrow(
      'That code has already been used.',
    )
  })

  it('keeps single-use codes single-use across accounts', async () => {
    await promoCodeService.redeem('alex', 'BUDDY-7K4M-2Q9P')
    await expect(promoCodeService.redeem('ben', 'BUDDY-7K4M-2Q9P')).rejects.toThrow(
      'That code has already been used.',
    )
    expect(await promoCodeService.hasRedemption('ben')).toBe(false)
  })

  it('refuses unknown and malformed codes before touching the backend', async () => {
    await expect(promoCodeService.redeem('alex', 'BUDDY-AAAA-AAAA')).rejects.toThrow(
      'That code is not valid.',
    )
    await expect(promoCodeService.redeem('alex', '../promoCodes/x')).rejects.toThrow(
      'That code is not valid.',
    )
    expect(store.size).toBe(0)
  })
})

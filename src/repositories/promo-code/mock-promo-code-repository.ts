import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { MOCK_REDEEM_CODES, MOCK_REUSABLE_REDEEM_CODES } from '@/constants/entitlements'
import { delay, readStore, writeStore } from '@/repositories/mock-store'
import {
  reusableRedemptionId,
  type PromoCodeRepository,
} from '@/repositories/promo-code/promo-code-repository'
import {
  PURCHASES_ERROR_CODES,
  purchasesRepositoryError,
} from '@/services/purchases/purchases-error'

/** Redemption id → the account that redeemed it, same ids as Firestore. */
type RedemptionStore = Record<string, string>

const isRedemptionStore = (value: unknown): value is RedemptionStore =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every((userId) => typeof userId === 'string'),
  )

const read = () =>
  readStore<RedemptionStore>(MOCK_STORAGE_KEYS.redeemedCodes, {}, isRedemptionStore)

const isOneOf = (list: readonly string[], code: string) => list.includes(code)

/** Mock mode only: the demo codes stand in for the `promoCodes` collection. */
export const mockPromoCodeRepository: PromoCodeRepository = {
  async redeem(userId, code) {
    const isReusable = isOneOf(MOCK_REUSABLE_REDEEM_CODES, code)
    if (!isReusable && !isOneOf(MOCK_REDEEM_CODES, code)) {
      throw purchasesRepositoryError(PURCHASES_ERROR_CODES.invalidRedeemCode)
    }

    const id = isReusable ? reusableRedemptionId(code, userId) : code
    const redemptions = read()
    if (redemptions[id]) {
      throw purchasesRepositoryError(PURCHASES_ERROR_CODES.redeemedCode)
    }
    writeStore(MOCK_STORAGE_KEYS.redeemedCodes, { ...redemptions, [id]: userId })
    await delay(null)
  },

  async hasRedemption(userId) {
    return delay(Object.values(read()).includes(userId))
  },
}

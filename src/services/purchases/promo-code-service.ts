import { isMockRedeemCodeFormat, normalizeMockRedeemCode } from '@/constants/entitlements'
import { isValidDocumentId } from '@/lib/ids'
import { promoCodeRepository } from '@/repositories/repositories'
import {
  PURCHASES_ERROR_CODES,
  PURCHASES_FALLBACK_MESSAGES,
  purchasesRepositoryError,
  toPurchasesError,
} from '@/services/purchases/purchases-error'

/**
 * Buddy+ from a promo code, beside (never inside) the RevenueCat
 * entitlement: the code is checked by the backend, and the grant lives on the
 * account, so it follows the member to every device and platform.
 */
export const promoCodeService = {
  async redeem(userId: string, rawCode: string): Promise<void> {
    const code = normalizeMockRedeemCode(rawCode)
    try {
      // Checked before any request: the code also becomes a document id.
      if (!isValidDocumentId(userId) || !isMockRedeemCodeFormat(code)) {
        throw purchasesRepositoryError(PURCHASES_ERROR_CODES.invalidRedeemCode)
      }
      await promoCodeRepository.redeem(userId, code)
    } catch (error) {
      throw toPurchasesError(error, PURCHASES_FALLBACK_MESSAGES.redeem)
    }
  },

  /** Never throws: a failed check just means no promo Buddy+ this session. */
  async hasRedemption(userId: string): Promise<boolean> {
    if (!isValidDocumentId(userId)) return false
    return promoCodeRepository.hasRedemption(userId).catch(() => false)
  },
}

/**
 * Buddy+ promo codes, held by the BACKEND rather than the app bundle.
 *
 * `promoCodes/{code}` is written by the project owner (console or admin
 * script) and is never readable by a client. A member redeems by creating
 * their own `promoRedemptions/{id}` document; the rules accept it only when
 * the code exists and is active. The id carries the usage limit:
 * `{code}__{uid}` for a reusable referral code (once per account), `{code}`
 * for a single-use code (once, ever).
 */
export const PROMO_CODES_COLLECTION = 'promoCodes'
export const PROMO_REDEMPTIONS_COLLECTION = 'promoRedemptions'

export const reusableRedemptionId = (code: string, userId: string) =>
  `${code}__${userId}`

export interface PromoCodeRepository {
  /** Throws a coded error (`invalidRedeemCode` / `redeemedCode`) on refusal. */
  redeem(userId: string, code: string): Promise<void>
  /** Whether this account has redeemed any code — i.e. holds promo Buddy+. */
  hasRedemption(userId: string): Promise<boolean>
}

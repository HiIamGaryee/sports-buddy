import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor'

/** Purchase/subscription failure with a message that is safe to show a user. */
export class PurchasesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PurchasesError'
  }
}

export const PURCHASES_FALLBACK_MESSAGES = {
  load: "We couldn't load Buddy+ plans right now.",
  purchase: "We couldn't complete that purchase. Please try again.",
  restore: "We couldn't restore your purchases. Please try again.",
  redeem: "We couldn't redeem that code. Please try again.",
} as const

/** Raised by the web purchases stand-in and the promo code repositories. */
export const PURCHASES_ERROR_CODES = {
  webOnly: 'purchases/web-only',
  invalidRedeemCode: 'purchases/invalid-redeem-code',
  redeemedCode: 'purchases/redeem-code-used',
} as const

export const purchasesRepositoryError = (code: string) =>
  Object.assign(new Error(code), { code })

const WEB_ONLY_MESSAGE =
  'Buddy+ purchases are only available in the Sports Buddy Android app.'

const INVALID_REDEEM_CODE_MESSAGE = 'That code is not valid.'
const REDEEMED_CODE_MESSAGE = 'That code has already been used.'

/** Only the RevenueCat codes worth a distinct sentence; everything else uses the fallback. */
const MESSAGES: Partial<Record<PURCHASES_ERROR_CODE, string>> = {
  [PURCHASES_ERROR_CODE.NETWORK_ERROR]:
    "You're offline. Check your connection and try again.",
  [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR]:
    "You're offline. Check your connection and try again.",
  [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR]:
    "You're already on Buddy+.",
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]:
    'Purchases are turned off on this device.',
  [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR]:
    'Your payment is still processing. Buddy+ unlocks once it clears.',
  [PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR]:
    'This purchase is already tied to another account.',
  [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR]:
    'Still working on your last request — please wait a moment.',
}

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

/**
 * Never surfaces a raw store error code, a price, or an account id — same
 * rule as every other error mapper in this app.
 */
export function toPurchasesError(error: unknown, fallback: string): PurchasesError {
  const code = getCode(error)
  if (code === PURCHASES_ERROR_CODES.webOnly) return new PurchasesError(WEB_ONLY_MESSAGE)
  if (code === PURCHASES_ERROR_CODES.invalidRedeemCode) {
    return new PurchasesError(INVALID_REDEEM_CODE_MESSAGE)
  }
  if (code === PURCHASES_ERROR_CODES.redeemedCode) {
    return new PurchasesError(REDEEMED_CODE_MESSAGE)
  }
  if (isRevenueCatCode(code)) return new PurchasesError(MESSAGES[code as PURCHASES_ERROR_CODE] ?? fallback)
  return new PurchasesError(fallback)
}

const isRevenueCatCode = (code: string): code is PURCHASES_ERROR_CODE =>
  Object.values(PURCHASES_ERROR_CODE).includes(code as PURCHASES_ERROR_CODE)

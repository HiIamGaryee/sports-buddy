import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import {
  PROMO_REDEMPTIONS_COLLECTION,
  reusableRedemptionId,
  type PromoCodeRepository,
} from '@/repositories/promo-code/promo-code-repository'
import { getFirebaseDb } from '@/services/firebase/client'
import {
  PURCHASES_ERROR_CODES,
  purchasesRepositoryError,
} from '@/services/purchases/purchases-error'

const redemptionRef = (id: string) =>
  doc(getFirebaseDb(), PROMO_REDEMPTIONS_COLLECTION, id)

const isPermissionDenied = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === 'permission-denied'

/**
 * The client cannot see a code's settings, so it tries the reusable slot
 * first and the single-use slot second; the rules accept exactly the one
 * that matches the code, and neither when the code is unknown or inactive.
 */
async function create(id: string, userId: string, code: string) {
  try {
    await setDoc(redemptionRef(id), { code, userId, redeemedAt: serverTimestamp() })
    return true
  } catch (error) {
    if (isPermissionDenied(error)) return false
    throw error
  }
}

export const firebasePromoCodeRepository: PromoCodeRepository = {
  async redeem(userId, code) {
    const reusableId = reusableRedemptionId(code, userId)
    // Own document: readable, so a second try gets an honest "already used".
    if ((await getDoc(redemptionRef(reusableId))).exists()) {
      throw purchasesRepositoryError(PURCHASES_ERROR_CODES.redeemedCode)
    }
    if (await create(reusableId, userId, code)) return
    if (await create(code, userId, code)) return

    // A single-use slot someone already holds is not readable by anyone
    // else, so "taken" and "unknown" are only told apart by this read.
    const taken = await getDoc(redemptionRef(code)).then(
      (snapshot) => snapshot.exists(),
      (error: unknown) => isPermissionDenied(error),
    )
    throw purchasesRepositoryError(
      taken ? PURCHASES_ERROR_CODES.redeemedCode : PURCHASES_ERROR_CODES.invalidRedeemCode,
    )
  },

  async hasRedemption(userId) {
    const snapshot = await getDocs(
      query(
        collection(getFirebaseDb(), PROMO_REDEMPTIONS_COLLECTION),
        where('userId', '==', userId),
        limit(1),
      ),
    )
    return !snapshot.empty
  },
}

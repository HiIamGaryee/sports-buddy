/** Application-level auth failure with a message that is safe to show a user. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address does not look right.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Please try again in a moment.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/operation-not-allowed':
    'This sign-in method is not enabled for the project.',
  'auth/unauthorized-domain':
    'This domain is not authorised for Google sign-in.',
}

/** Sign-in attempts the user themselves abandoned — not an error worth showing. */
const CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

export const isCancelledAuthError = (error: unknown) =>
  CANCELLED_CODES.has(getCode(error))

export function toAuthError(error: unknown): AuthError {
  const code = getCode(error)
  if (MESSAGES[code]) return new AuthError(MESSAGES[code])
  if (error instanceof Error && error.message && !code) {
    return new AuthError(error.message)
  }
  return new AuthError('Something went wrong. Please try again.')
}

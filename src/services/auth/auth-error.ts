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
  'auth/account-exists-with-different-credential':
    'An account with this email already exists using a different sign-in method. Try signing in with your email and password instead.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in pop-up. Please allow pop-ups for this site and try again.',
  'auth/operation-not-supported-in-this-environment':
    "Google sign-in isn't supported in this app environment. Please use email sign-in instead.",
  'auth/internal-error': 'Something went wrong. Please try again.',
  'auth/requires-recent-login':
    'Please sign in again to continue.',
  // Not an `auth/*` code: these come from the Firestore write that creates
  // `users/{uid}` right after the auth account itself is created.
  'permission-denied':
    "We couldn't set up your profile. Please try again in a moment.",
  unavailable: 'Network error. Check your connection and try again.',
  unauthenticated: 'Your session expired. Please sign in again.',
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
  // Dev-only diagnostic: the stable error CODE only (e.g. `auth/popup-blocked`
  // or Firestore's `permission-denied`) — never the raw message, stack or any
  // token/password — so a sign-in that only ever shows "Something went
  // wrong." can be identified from the browser console during development.
  // `import.meta.env.DEV` is compiled away in production builds.
  if (import.meta.env.DEV) {
    console.warn('[sports-buddy auth] error code:', code || '(no code)')
  }
  if (MESSAGES[code]) return new AuthError(MESSAGES[code])
  if (error instanceof Error && error.message && !code) {
    return new AuthError(error.message)
  }
  return new AuthError('Something went wrong. Please try again.')
}

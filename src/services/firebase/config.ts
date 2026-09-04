import { env } from '@/config/env'

export const firebaseConfig = env.firebase

const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
] as const satisfies readonly (keyof typeof firebaseConfig)[]

export const missingFirebaseConfigKeys = REQUIRED_KEYS.filter(
  (key) => !firebaseConfig[key],
)

export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0

/** Throws a developer-facing error instead of a cryptic SDK failure. */
export function assertFirebaseConfigured() {
  if (isFirebaseConfigured) return

  const missing = missingFirebaseConfigKeys
    .map((key) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`)
    .join(', ')

  throw new Error(
    `Firebase is not configured. Missing: ${missing}. ` +
      'Fill them in .env (see docs/firebase.md) or set VITE_DATA_SOURCE=mock.',
  )
}

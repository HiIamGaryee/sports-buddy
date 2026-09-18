import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

import { assertFirebaseConfigured, firebaseConfig } from '@/services/firebase/config'

/**
 * The only place Firebase is initialised. Everything is created lazily so
 * mock mode never needs credentials.
 */
let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function getFirebaseApp(): FirebaseApp {
  assertFirebaseConfigured()
  app ??= getApps()[0] ?? initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth(): Auth {
  // Firebase manages the session itself; we only pick where it is stored.
  // `initializeAuth` (unlike `getAuth`) does not include a popup/redirect
  // resolver unless one is passed explicitly — without it, `signInWithPopup`
  // fails with `auth/argument-error` the moment it touches redirect-user
  // persistence internally, even though nothing about the popup itself is
  // wrong.
  auth ??= initializeAuth(getFirebaseApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  })
  return auth
}

export function getFirebaseDb(): Firestore {
  db ??= getFirestore(getFirebaseApp())
  return db
}

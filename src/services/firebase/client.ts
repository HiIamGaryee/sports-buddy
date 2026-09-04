import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
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
  auth ??= initializeAuth(getFirebaseApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  })
  return auth
}

export function getFirebaseDb(): Firestore {
  db ??= getFirestore(getFirebaseApp())
  return db
}

import type { DataSource } from '@/types/data-source'

const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'firebase' ? 'firebase' : 'mock'

/** Single read point for build-time environment variables. */
export const env = {
  /** Which backend the repositories talk to. Defaults to `mock`. */
  dataSource,
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
} as const

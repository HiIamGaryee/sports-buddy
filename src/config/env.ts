import type { DataSource, VenueSource } from '@/types/data-source'

const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'firebase' ? 'firebase' : 'mock'

/**
 * Deliberately independent of `dataSource`: a Firebase backend with mock
 * venues is the normal development setup, and Google billing should not be a
 * prerequisite for working on anything else.
 */
const venueSource: VenueSource =
  import.meta.env.VITE_VENUE_SOURCE === 'google' ? 'google' : 'mock'

/** Single read point for build-time environment variables. */
export const env = {
  /** Which backend the repositories talk to. Defaults to `mock`. */
  dataSource,
  /** Where venue search comes from. Defaults to `mock`. */
  venueSource,
  google: {
    /**
     * A Maps browser key is public by design — it is restricted in Google
     * Cloud (API + HTTP referrer restrictions and quotas), not hidden. It is
     * still only ever read here and never logged.
     */
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
} as const

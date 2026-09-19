import type { DataSource, VenueSource } from '@/types/data-source'

const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'firebase' ? 'firebase' : 'mock'

/** Deliberately independent of `dataSource`: OpenStreetMap is the default. */
const venueSource: VenueSource =
  import.meta.env.VITE_VENUE_SOURCE === 'google'
    ? 'google'
    : import.meta.env.VITE_VENUE_SOURCE === 'mock'
      ? 'mock'
      : 'openstreetmap'

/** Single read point for build-time environment variables. */
export const env = {
  /** Which backend the repositories talk to. Defaults to `mock`. */
  dataSource,
  /** Where venue search comes from. Defaults to `mock`. */
  venueSource,
  /**
   * Where the web app is publicly hosted (e.g. `https://sportbuddy-4d596.web.app`),
   * used to build share links. Optional: the browser's own origin is used when
   * it is missing, which is right on the web but not inside the native app.
   */
  publicAppUrl: import.meta.env.VITE_PUBLIC_APP_URL,
  google: {
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  },
  revenueCat: {
    /**
     * RevenueCat's Android PUBLIC SDK key — safe to ship in a client bundle
     * by design (same trust level as the Firebase web config above); it can
     * only fetch offerings and record purchases already tied to a signed-in
     * user, never read or change billing on its own. Missing in web/mock
     * mode is expected: purchases are Android-only (see purchases-service.ts).
     */
    androidApiKey: import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY,
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

import { env } from '@/config/env'

/**
 * The ONLY place the Maps JavaScript API is loaded. One cached promise, one
 * script tag, however many maps render — no component injects a script.
 *
 * Search does not go through here: Places (New) is called over REST by the
 * venue repository, so a page with no map loads no Google JavaScript at all.
 */
declare global {
  interface Window {
    __sportsBuddyMapsReady?: () => void
  }
}

const CALLBACK_NAME = '__sportsBuddyMapsReady'
const SCRIPT_ID = 'sports-buddy-google-maps'

let loader: Promise<typeof google.maps> | null = null

/** Whether a map can be attempted at all. The list never depends on this. */
export const isMapsConfigured = () => Boolean(env.google.mapsApiKey)

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loader) return loader

  const key = env.google.mapsApiKey
  if (!key) {
    // Rejected without the key in the message — it is never logged.
    return Promise.reject(new Error('maps/not-configured'))
  }

  loader = new Promise<typeof google.maps>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('maps/no-document'))
      return
    }

    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME]
      resolve(google.maps)
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    const params = new URLSearchParams({
      key,
      v: 'weekly',
      loading: 'async',
      callback: CALLBACK_NAME,
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.onerror = () => {
      // Allow a later retry rather than caching the failure forever.
      loader = null
      reject(new Error('maps/load-failed'))
    }
    document.head.append(script)
  })

  return loader
}

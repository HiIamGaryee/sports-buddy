import { env } from '@/config/env'

declare global {
  interface Window {
    __sportsBuddyMapsReady?: () => void
  }
}

const CALLBACK_NAME = '__sportsBuddyMapsReady'
const SCRIPT_ID = 'sports-buddy-google-maps'
let loader: Promise<typeof google.maps> | null = null

/** Whether the optional Google map can be loaded. */
export const isMapsConfigured = () => Boolean(env.google.mapsApiKey)

/** Load Google Maps once, only when the Google provider is selected. */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loader) return loader
  const key = env.google.mapsApiKey
  if (!key) return Promise.reject(new Error('maps/not-configured'))

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
    const params = new URLSearchParams({ key, v: 'weekly', loading: 'async', callback: CALLBACK_NAME })
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.onerror = () => {
      loader = null
      reject(new Error('maps/load-failed'))
    }
    document.head.append(script)
  })
  return loader
}

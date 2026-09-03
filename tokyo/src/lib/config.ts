const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
export const ownerEmail = ((env.VITE_OWNER_EMAIL as string | undefined) ?? '').trim().toLowerCase()
export const placesKey = ((env.VITE_GOOGLE_PLACES_KEY as string | undefined) ?? '').trim()
export const hasPlaces = placesKey.length > 0
export const tilesUrl = ((env.VITE_TILES_URL as string | undefined) ?? '/tiles/tokyo.pmtiles').trim()
export const protomapsKey = ((env.VITE_PROTOMAPS_KEY as string | undefined) ?? '').trim()
export const appVersion = (env.VITE_APP_VERSION as string | undefined) ?? 'dev'

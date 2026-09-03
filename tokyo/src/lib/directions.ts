import { distanceM, getPosition, type LatLng } from './geo'
import type { Place } from '../model/types'

export type TravelMode = 'walking' | 'transit'

/** Under this distance we send people on foot; beyond it, on the trains. */
export const WALK_THRESHOLD_M = 1400

export function googleDirectionsUrl(place: Place, mode: TravelMode): string {
  const u = new URL('https://www.google.com/maps/dir/')
  u.searchParams.set('api', '1')
  u.searchParams.set('destination', `${place.lat},${place.lng}`)
  if (place.googlePlaceId) u.searchParams.set('destination_place_id', place.googlePlaceId)
  u.searchParams.set('travelmode', mode)
  return u.toString()
}

export function appleDirectionsUrl(place: Place, mode: TravelMode): string {
  const u = new URL('https://maps.apple.com/')
  u.searchParams.set('daddr', `${place.lat},${place.lng}`)
  u.searchParams.set('dirflg', mode === 'walking' ? 'w' : 'r')
  return u.toString()
}

export function googlePlaceUrl(place: Place): string {
  if (place.mapsUrl) return place.mapsUrl
  const u = new URL('https://www.google.com/maps/search/')
  u.searchParams.set('api', '1')
  u.searchParams.set('query', `${place.lat},${place.lng}`)
  if (place.googlePlaceId) u.searchParams.set('query_place_id', place.googlePlaceId)
  return u.toString()
}

export interface DirectionsPlan {
  mode: TravelMode
  distanceM: number | null
  from: LatLng | null
}

/** Picks walking vs transit from the user's live position. */
export async function planDirections(place: Place): Promise<DirectionsPlan> {
  const from = await getPosition()
  if (!from) return { mode: 'transit', distanceM: null, from: null }
  const d = distanceM(from, place)
  return { mode: d <= WALK_THRESHOLD_M ? 'walking' : 'transit', distanceM: d, from }
}

export function openExternal(url: string) {
  // On iOS home-screen apps, target=_blank hands the link to Safari / the
  // Google Maps app via universal links; window.location would leave the PWA.
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

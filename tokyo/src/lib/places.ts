import { categoryFromTypes } from '../model/categories'
import type { Place } from '../model/types'
import { placesKey } from './config'
import type { LatLng } from './geo'
import { newId } from './ids'

const BASE = 'https://places.googleapis.com/v1'

export interface SearchHit {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  primaryType?: string
  types?: string[]
}

interface GPlace {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  shortFormattedAddress?: string
  location?: { latitude: number; longitude: number }
  primaryTypeDisplayName?: { text: string }
  primaryType?: string
  types?: string[]
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  editorialSummary?: { text: string }
  websiteUri?: string
  googleMapsUri?: string
  internationalPhoneNumber?: string
  nationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  photos?: { name: string; widthPx?: number; heightPx?: number }[]
}

function headers(fieldMask: string) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': placesKey,
    'X-Goog-FieldMask': fieldMask,
  }
}

async function check(res: Response) {
  if (res.ok) return
  let msg = `${res.status} ${res.statusText}`
  try {
    const j = await res.json()
    msg = j?.error?.message ?? msg
  } catch { /* not json */ }
  throw new Error(msg)
}

/** Text search biased to Tokyo. Accepts a plain name or a pasted Google Maps URL. */
export async function searchPlaces(query: string, bias: LatLng, radiusM = 40000): Promise<SearchHit[]> {
  if (!placesKey) throw new Error('No Google Places key configured')
  const textQuery = queryFromInput(query)
  if (!textQuery) return []
  const res = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: headers('places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.primaryType,places.types'),
    body: JSON.stringify({
      textQuery,
      languageCode: 'en',
      regionCode: 'JP',
      pageSize: 8,
      locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: radiusM } },
    }),
  })
  await check(res)
  const j = (await res.json()) as { places?: GPlace[] }
  return (j.places ?? []).filter((p) => p.location).map((p) => ({
    id: p.id,
    name: p.displayName?.text ?? 'Untitled',
    address: p.shortFormattedAddress ?? p.formattedAddress,
    lat: p.location!.latitude,
    lng: p.location!.longitude,
    primaryType: p.primaryType,
    types: p.types,
  }))
}

/** Pulls a searchable name out of a pasted Google Maps URL, else returns the input. */
export function queryFromInput(input: string): string {
  const s = input.trim()
  if (!/^https?:\/\//i.test(s)) return s
  try {
    const u = new URL(s)
    const m = u.pathname.match(/\/maps\/place\/([^/]+)/)
    if (m) return decodeURIComponent(m[1]!.replace(/\+/g, ' '))
    const q = u.searchParams.get('q') ?? u.searchParams.get('query')
    if (q) return q
  } catch { /* fallthrough */ }
  return s
}

const DETAIL_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'location', 'primaryType', 'primaryTypeDisplayName',
  'types', 'regularOpeningHours', 'editorialSummary', 'websiteUri', 'googleMapsUri', 'internationalPhoneNumber',
  'nationalPhoneNumber', 'rating', 'userRatingCount', 'priceLevel', 'photos',
].join(',')

/** Fetches full details and resolves photo URLs. Returns a Place ready to save. */
export async function fetchPlaceDetails(googlePlaceId: string, existing?: Partial<Place>): Promise<Place> {
  if (!placesKey) throw new Error('No Google Places key configured')
  const res = await fetch(`${BASE}/places/${encodeURIComponent(googlePlaceId)}?languageCode=en&regionCode=JP`, {
    headers: headers(DETAIL_FIELDS),
  })
  await check(res)
  const p = (await res.json()) as GPlace
  const photos = await resolvePhotos(p.photos ?? [], 6)
  const now = Date.now()
  return {
    id: existing?.id ?? newId('p'),
    name: existing?.name?.trim() || p.displayName?.text || 'Untitled',
    category: existing?.category ?? categoryFromTypes(p.types, p.primaryType),
    groupIds: existing?.groupIds ?? [],
    lat: p.location?.latitude ?? existing?.lat ?? 0,
    lng: p.location?.longitude ?? existing?.lng ?? 0,
    address: p.formattedAddress ?? existing?.address,
    description: p.editorialSummary?.text ?? existing?.description,
    notes: existing?.notes,
    hours: p.regularOpeningHours?.weekdayDescriptions,
    website: p.websiteUri,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
    mapsUrl: p.googleMapsUri,
    googlePlaceId: p.id,
    photos: photos.length ? photos : (existing?.photos ?? []),
    rating: p.rating,
    ratingCount: p.userRatingCount,
    priceLevel: p.priceLevel ? priceLabel(p.priceLevel) : undefined,
    primaryType: p.primaryTypeDisplayName?.text,
    booked: existing?.booked,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function priceLabel(level: string): string | undefined {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return 'Free'
    case 'PRICE_LEVEL_INEXPENSIVE': return '¥'
    case 'PRICE_LEVEL_MODERATE': return '¥¥'
    case 'PRICE_LEVEL_EXPENSIVE': return '¥¥¥'
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '¥¥¥¥'
    default: return undefined
  }
}

/**
 * Photo names must be exchanged for a URL. With skipHttpRedirect the API
 * returns the final googleusercontent URL, which doesn't carry our key and
 * can be cached for offline use.
 */
async function resolvePhotos(photos: { name: string }[], max: number): Promise<string[]> {
  const out: string[] = []
  await Promise.all(photos.slice(0, max).map(async (ph, i) => {
    try {
      const u = `${BASE}/${ph.name}/media?maxWidthPx=1000&maxHeightPx=1000&skipHttpRedirect=true&key=${encodeURIComponent(placesKey)}`
      const res = await fetch(u)
      if (!res.ok) return
      const j = (await res.json()) as { photoUri?: string }
      if (j.photoUri) out[i] = j.photoUri
    } catch { /* skip photo */ }
  }))
  return out.filter(Boolean)
}

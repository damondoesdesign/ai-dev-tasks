import { tilesUrl } from './config'

export const MAP_CACHE = 'tokyo-map-v1'
export const PHOTO_CACHE = 'tokyo-photos-v1'
const MAP_KEY = '/__offline/tokyo.pmtiles'

export interface MapCacheStatus { cached: boolean; bytes: number | null }

export function isPmtiles(): boolean {
  return /\.pmtiles(\?|$)/i.test(tilesUrl)
}

export async function mapCacheStatus(): Promise<MapCacheStatus> {
  if (!('caches' in self)) return { cached: false, bytes: null }
  try {
    const c = await caches.open(MAP_CACHE)
    const r = await c.match(MAP_KEY)
    if (!r) return { cached: false, bytes: null }
    const len = r.headers.get('x-tokyo-size')
    return { cached: true, bytes: len ? Number(len) : null }
  } catch { return { cached: false, bytes: null } }
}

/** Streams the .pmtiles into Cache Storage, reporting progress in bytes. */
export async function downloadMap(onProgress: (loaded: number, total: number | null) => void, signal?: AbortSignal): Promise<void> {
  if (!isPmtiles()) throw new Error('Offline download needs a .pmtiles tile source')
  const res = await fetch(tilesUrl, { signal })
  if (!res.ok || !res.body) throw new Error(`Map download failed (${res.status})`)
  const total = Number(res.headers.get('content-length')) || null
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress(loaded, total)
  }
  const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' })
  const c = await caches.open(MAP_CACHE)
  await c.put(MAP_KEY, new Response(blob, { headers: { 'content-type': 'application/octet-stream', 'x-tokyo-size': String(blob.size) } }))
  blobCache = null
}

export async function deleteMapCache() {
  const c = await caches.open(MAP_CACHE)
  await c.delete(MAP_KEY)
  blobCache = null
}

let blobCache: Blob | null = null
/** The cached archive as a Blob (a handle, not bytes in memory). */
export async function cachedMapBlob(): Promise<Blob | null> {
  if (blobCache) return blobCache
  try {
    const c = await caches.open(MAP_CACHE)
    const r = await c.match(MAP_KEY)
    if (!r) return null
    blobCache = await r.blob()
    return blobCache
  } catch { return null }
}

export interface PhotoSyncProgress { done: number; total: number; failed: number }

/** Pre-fetches every place photo so viewers have them offline. */
export async function syncPhotos(urls: string[], onProgress: (p: PhotoSyncProgress) => void, signal?: AbortSignal): Promise<PhotoSyncProgress> {
  const unique = Array.from(new Set(urls.filter(Boolean)))
  const p: PhotoSyncProgress = { done: 0, total: unique.length, failed: 0 }
  if (!('caches' in self)) return p
  const c = await caches.open(PHOTO_CACHE)
  const queue = [...unique]
  const worker = async () => {
    while (queue.length && !signal?.aborted) {
      const u = queue.shift()!
      try {
        if (!(await c.match(u))) {
          const r = await fetch(u, { mode: 'no-cors', signal })
          await c.put(u, r)
        }
      } catch { p.failed++ }
      p.done++
      onProgress({ ...p })
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return p
}

export function fmtBytes(n: number | null): string {
  if (n == null) return ''
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(n < 100 * 1024 * 1024 ? 1 : 0)} MB`
}

export function onlineStatus(cb: (online: boolean) => void): () => void {
  const h = () => cb(navigator.onLine)
  addEventListener('online', h); addEventListener('offline', h)
  h()
  return () => { removeEventListener('online', h); removeEventListener('offline', h) }
}

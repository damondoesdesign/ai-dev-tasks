/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting() })

// App shell: everything Vite emitted is precached and served offline.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/__\//, /\/tiles\//] }))

// Map fonts and sprites: small, immutable.
registerRoute(
  ({ url }) => url.hostname === 'protomaps.github.io',
  new CacheFirst({ cacheName: 'tokyo-map-assets-v1' }),
)

// Place photos. The app's "Sync photos" fills this same cache ahead of time.
registerRoute(
  ({ url }) => /googleusercontent\.com$/.test(url.hostname) || url.hostname === 'lh3.googleusercontent.com',
  new CacheFirst({ cacheName: 'tokyo-photos-v1', matchOptions: { ignoreVary: true } }),
)

// Remote vector tiles (api.protomaps.com) when not using a .pmtiles archive:
// keep what you've looked at.
registerRoute(
  ({ url }) => url.hostname === 'api.protomaps.com',
  new NetworkFirst({ cacheName: 'tokyo-tiles-v1', networkTimeoutSeconds: 4 }),
)

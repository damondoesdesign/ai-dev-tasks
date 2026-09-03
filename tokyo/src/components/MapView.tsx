import type { FeatureCollection } from 'geojson'
import { addProtocol, LngLatBounds, Map as MLMap, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre resolves its worker relative to its own file, which a bundler breaks;
// let Vite bundle the worker and hand MapLibre the resulting URL.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { PMTiles, Protocol, type RangeResponse, type Source } from 'pmtiles'
import { useEffect, useRef } from 'react'
import { tilesUrl } from '../lib/config'
import type { LatLng } from '../lib/geo'
import { blankStyle, buildStyle } from '../lib/mapStyle'
import { cachedMapBlob, isPmtiles } from '../lib/offline'
import { CATEGORY_MAP } from '../model/categories'
import type { Place } from '../model/types'

/** Reads a PMTiles archive out of Cache Storage without loading it into memory. */
class BlobSource implements Source {
  constructor(private blob: Blob, private key: string) {}
  getKey() { return this.key }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    return { data: await this.blob.slice(offset, offset + length).arrayBuffer() }
  }
}

setWorkerUrl(mapWorkerUrl)

let protocol: Protocol | null = null
let registeredKey: string | null = null
export function absoluteTilesUrl(): string {
  return new URL(tilesUrl, location.origin).href
}
async function ensureProtocol(): Promise<void> {
  if (!protocol) {
    protocol = new Protocol({ metadata: false })
    addProtocol('pmtiles', protocol.tilev4)
  }
  if (!isPmtiles()) return
  const key = absoluteTilesUrl()
  const blob = await cachedMapBlob()
  const wantKey = blob ? `${key}#cached` : key
  if (registeredKey === wantKey) return
  const archive = new PMTiles(blob ? new BlobSource(blob, key) : key)
  await archive.getHeader() // throws on 404 / not a PMTiles file
  protocol.add(archive)
  registeredKey = wantKey
}
/** Called after "Download map" so the next style load reads from cache. */
export function resetTileSource() { registeredKey = null }

export interface MapViewProps {
  places: Place[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  dark: boolean
  /** placeId -> 1-based order when showing a single day. */
  order?: Map<string, number> | null
  center: LatLng
  /** Increment to fit all visible places into view. */
  fitToken: number
  /** Increment to fly to the selected place. */
  flyToken: number
  userPos: LatLng | null
  tilesOk: boolean
  /** Called when the tile source can't be opened; the caller should drop tilesOk. */
  onTilesFailed: () => void
}

const SRC = 'places'
/** Text layers live on a second copy of the data: if glyphs can't load (offline before
 *  fonts were cached), a failed label tile must not take the dots down with it. */
const SRC_TEXT = 'places-text'
const ROUTE = 'route'

function toGeoJSON(places: Place[], selectedId: string | null, order?: Map<string, number> | null): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        name: p.name,
        mark: order?.get(p.id) != null ? String(order.get(p.id)) : CATEGORY_MAP[p.category]?.mark ?? '·',
        sel: p.id === selectedId ? 1 : 0,
        ord: order?.get(p.id) ?? 0,
      },
    })),
  }
}

function routeGeoJSON(places: Place[], order?: Map<string, number> | null): FeatureCollection {
  if (!order || order.size < 2) return { type: 'FeatureCollection', features: [] }
  const pts = places.filter((p) => order.has(p.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!)
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map((p) => [p.lng, p.lat]) } }],
  }
}

function addLayers(map: MLMap, dark: boolean) {
  const ink = dark ? '#f2f2f0' : '#111111'
  const halo = dark ? '#0e0e0e' : '#ffffff'
  const accent = dark ? '#ff5a4e' : '#d5322a'
  if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'id' })
  if (!map.getSource(SRC_TEXT)) map.addSource(SRC_TEXT, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'id' })
  if (!map.getSource(ROUTE)) map.addSource(ROUTE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  if (!map.getSource('me')) map.addSource('me', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'route-line', type: 'line', source: ROUTE,
    paint: { 'line-color': ink, 'line-width': 1.5, 'line-dasharray': [1, 2], 'line-opacity': 0.6 },
  })
  map.addLayer({
    id: 'pin-halo', type: 'circle', source: SRC,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['case', ['==', ['get', 'sel'], 1], 16, 7], 14, ['case', ['==', ['get', 'sel'], 1], 18, 12]],
      'circle-color': halo, 'circle-opacity': 0.9,
    },
  })
  map.addLayer({
    id: 'pin', type: 'circle', source: SRC,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['case', ['==', ['get', 'sel'], 1], 13, 5], 14, ['case', ['==', ['get', 'sel'], 1], 15, 10]],
      'circle-color': ['case', ['==', ['get', 'sel'], 1], accent, ink],
    },
  })
  map.addLayer({
    id: 'pin-mark', type: 'symbol', source: SRC_TEXT, minzoom: 12,
    layout: { 'text-field': ['get', 'mark'], 'text-size': ['case', ['==', ['get', 'sel'], 1], 12, 9], 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true },
    paint: { 'text-color': ['case', ['==', ['get', 'sel'], 1], dark ? '#111' : '#fff', halo] },
  })
  map.addLayer({
    id: 'pin-label', type: 'symbol', source: SRC_TEXT, minzoom: 13.5,
    layout: {
      'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Noto Sans Medium'], 'text-offset': [0, 1.3], 'text-anchor': 'top',
      'text-max-width': 9, 'text-optional': true, 'text-letter-spacing': -0.01,
    },
    paint: { 'text-color': ink, 'text-halo-color': halo, 'text-halo-width': 1.6 },
  })
  map.addLayer({ id: 'me-halo', type: 'circle', source: 'me', paint: { 'circle-radius': 12, 'circle-color': accent, 'circle-opacity': 0.2 } })
  map.addLayer({ id: 'me', type: 'circle', source: 'me', paint: { 'circle-radius': 6, 'circle-color': accent, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } })
}

export default function MapView(props: MapViewProps) {
  const { places, selectedId, dark, order, center, fitToken, flyToken, userPos, tilesOk } = props
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const styleReady = useRef(false)

  const pushData = () => {
    const map = mapRef.current
    if (!map || !styleReady.current) return
    const p = propsRef.current
    const fc = toGeoJSON(p.places, p.selectedId, p.order)
    ;(map.getSource(SRC) as GeoJSONSource | undefined)?.setData(fc)
    ;(map.getSource(SRC_TEXT) as GeoJSONSource | undefined)?.setData(fc)
    ;(map.getSource(ROUTE) as GeoJSONSource | undefined)?.setData(routeGeoJSON(p.places, p.order))
    ;(map.getSource('me') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: p.userPos ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.userPos.lng, p.userPos.lat] } }] : [],
    })
  }

  // Create the map once.
  useEffect(() => {
    if (!el.current || mapRef.current) return
    const map = new MLMap({
      container: el.current,
      style: blankStyle(propsRef.current.dark),
      center: [center.lng, center.lat],
      zoom: 11.6,
      minZoom: 8,
      maxZoom: 18,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      fadeDuration: 0,
    })
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    if (import.meta.env.DEV) (window as unknown as { __map?: MLMap }).__map = map
    const onStyle = () => { styleReady.current = true; addLayers(map, propsRef.current.dark); pushData() }
    map.on('style.load', onStyle)
    map.on('click', 'pin', (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (f?.properties?.id) propsRef.current.onSelect(String(f.properties.id))
    })
    map.on('click', (e: MapMouseEvent) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ['pin', 'pin-halo'] })
      if (!hits.length) propsRef.current.onSelect(null)
    })
    map.on('mouseenter', 'pin', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'pin', () => { map.getCanvas().style.cursor = '' })
    map.on('error', (e: { error?: { message?: string } }) => {
      // Missing tiles/glyphs are expected offline; keep the console quiet.
      if (import.meta.env.DEV) console.debug('map', e.error?.message)
    })
    return () => { map.remove(); mapRef.current = null; styleReady.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap the basemap style when the theme flips or tiles become available.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    ;(async () => {
      let style: StyleSpecification
      if (tilesOk) {
        try { await ensureProtocol(); style = buildStyle(dark) }
        catch { style = blankStyle(dark); propsRef.current.onTilesFailed() }
      } else style = blankStyle(dark)
      if (cancelled) return
      styleReady.current = false
      map.setStyle(style)
    })()
    return () => { cancelled = true }
  }, [dark, tilesOk])

  useEffect(pushData, [places, selectedId, order, userPos]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitToken) return
    const pts = propsRef.current.places
    if (!pts.length) return
    if (pts.length === 1) { map.easeTo({ center: [pts[0]!.lng, pts[0]!.lat], zoom: 14.5 }); return }
    const b = new LngLatBounds()
    pts.forEach((p) => b.extend([p.lng, p.lat]))
    map.fitBounds(b, { padding: { top: 120, bottom: 140, left: 40, right: 40 }, maxZoom: 15, duration: 500 })
  }, [fitToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyToken) return
    const p = propsRef.current.places.find((x) => x.id === propsRef.current.selectedId)
    if (!p) return
    map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 14), offset: [0, -60], duration: 400 })
  }, [flyToken])

  return <div className="map-wrap"><div ref={el} className="map-el" /></div>
}

export function flyTo(map: MLMap | null, pos: LatLng) {
  map?.easeTo({ center: [pos.lng, pos.lat], zoom: Math.max(map.getZoom(), 14) })
}

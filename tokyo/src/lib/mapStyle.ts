import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
import type { StyleSpecification } from 'maplibre-gl'
import { protomapsKey, tilesUrl } from './config'
import { isPmtiles } from './offline'

export const SOURCE = 'basemap'
const ASSETS = 'https://protomaps.github.io/basemaps-assets'

/**
 * Two near-monochrome flavors built on Protomaps' "white" and "black"
 * themes: no colour except water and a whisper of green for parks, so the
 * pins carry all the emphasis.
 */
function flavor(dark: boolean): Flavor {
  const base = namedFlavor(dark ? 'black' : 'white')
  const f: Flavor = { ...base }
  if (dark) {
    f.background = '#0e0e0e'; f.earth = '#0e0e0e'; f.buildings = '#151515'
    f.water = '#1a1e24'; f.park_a = '#131713'; f.park_b = '#131713'; f.wood_a = '#121612'; f.wood_b = '#121612'
    f.railway = '#2a2a2a'; f.major = '#2b2b2b'; f.minor_a = '#232323'; f.minor_b = '#232323'; f.highway = '#333333'
    f.city_label = '#d0d0d0'; f.city_label_halo = '#0e0e0e'; f.subplace_label = '#8a8a8a'; f.subplace_label_halo = '#0e0e0e'
    f.roads_label_minor = '#6c6c6c'; f.roads_label_minor_halo = '#0e0e0e'; f.roads_label_major = '#8c8c8c'; f.roads_label_major_halo = '#0e0e0e'
    f.address_label = '#555'; f.address_label_halo = '#0e0e0e'
  } else {
    f.background = '#f7f7f5'; f.earth = '#f7f7f5'; f.buildings = '#eeeeeb'
    f.water = '#dfe6ec'; f.park_a = '#e9efe6'; f.park_b = '#e9efe6'; f.wood_a = '#e6ece2'; f.wood_b = '#e6ece2'
    f.railway = '#d5d5d2'; f.major = '#ffffff'; f.major_casing_early = '#e3e3e0'; f.major_casing_late = '#e3e3e0'
    f.minor_a = '#ffffff'; f.minor_b = '#ffffff'; f.highway = '#ffffff'; f.highway_casing_early = '#dcdcd9'; f.highway_casing_late = '#dcdcd9'
    f.city_label = '#222'; f.city_label_halo = '#f7f7f5'; f.subplace_label = '#6b6b6b'; f.subplace_label_halo = '#f7f7f5'
    f.roads_label_minor = '#9a9a97'; f.roads_label_minor_halo = '#ffffff'; f.roads_label_major = '#6b6b6b'; f.roads_label_major_halo = '#ffffff'
    f.address_label = '#aaa'; f.address_label_halo = '#f7f7f5'
  }
  // Points of interest from the basemap compete with ours: turn them off.
  f.pois = undefined
  return f
}

export function buildStyle(dark: boolean): StyleSpecification {
  const fl = flavor(dark)
  const source: StyleSpecification['sources'][string] = isPmtiles()
    ? { type: 'vector', url: `pmtiles://${tilesUrl}`, attribution: '© OpenStreetMap, Protomaps' }
    : {
        type: 'vector',
        tiles: [protomapsKey ? `${tilesUrl}${tilesUrl.includes('?') ? '&' : '?'}key=${protomapsKey}` : tilesUrl],
        maxzoom: 15,
        attribution: '© OpenStreetMap, Protomaps',
      }
  const base = layers(SOURCE, fl, { lang: 'en' })
    // Drop POI layers, sprite-based icons and subtle noise we don't want on a minimal map.
    .filter((l) => !/pois|landuse_pedestrian|address/.test(l.id))
    .filter((l) => !(l.type === 'symbol' && l.layout && 'icon-image' in l.layout))
  return {
    version: 8,
    glyphs: `${ASSETS}/fonts/{fontstack}/{range}.pbf`,
    sources: { [SOURCE]: source },
    layers: base,
  }
}

/** Style with no tile source: used before tiles load or when none configured. */
export function blankStyle(dark: boolean): StyleSpecification {
  return {
    version: 8,
    glyphs: `${ASSETS}/fonts/{fontstack}/{range}.pbf`,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': dark ? '#0e0e0e' : '#f7f7f5' } }],
  }
}

import { unzipSync, strFromU8 } from 'fflate'
import type { CategoryId } from '../model/types'

/** A row parsed from a Google export, before enrichment. */
export interface ImportRow {
  name: string
  lat?: number
  lng?: number
  address?: string
  note?: string
  url?: string
  /** Folder name from a My Maps KML, if any. */
  folder?: string
  category?: CategoryId
}

export interface ImportResult {
  source: 'takeout-csv' | 'takeout-geojson' | 'kml' | 'json'
  rows: ImportRow[]
  warnings: string[]
}

export async function parseImportFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.kmz')) {
    const buf = new Uint8Array(await file.arrayBuffer())
    const files = unzipSync(buf)
    const kmlName = Object.keys(files).find((k) => k.toLowerCase().endsWith('.kml'))
    if (!kmlName) throw new Error('No .kml inside the .kmz')
    return parseKml(strFromU8(files[kmlName]!))
  }
  const text = await file.text()
  if (name.endsWith('.kml') || text.trimStart().startsWith('<?xml') || text.includes('<kml')) return parseKml(text)
  if (name.endsWith('.json') || name.endsWith('.geojson')) return parseJson(text)
  return parseTakeoutCsv(text)
}

/** Google Takeout > Maps (your places) > Saved > <list>.csv : Title,Note,URL,Comment[,Tags] */
export function parseTakeoutCsv(text: string): ImportResult {
  const rows = csvRows(text)
  const warnings: string[] = []
  if (!rows.length) return { source: 'takeout-csv', rows: [], warnings: ['Empty file'] }
  const header = rows[0]!.map((h) => h.trim().toLowerCase())
  const idx = (n: string) => header.indexOf(n)
  const ti = idx('title'), ni = idx('note'), ui = idx('url'), ci = idx('comment')
  if (ti < 0) warnings.push('No "Title" column found; treating first column as the name.')
  const out: ImportRow[] = []
  for (const r of rows.slice(1)) {
    const name = (r[ti >= 0 ? ti : 0] ?? '').trim()
    if (!name) continue
    const url = ui >= 0 ? r[ui]?.trim() : undefined
    const note = [ni >= 0 ? r[ni] : '', ci >= 0 ? r[ci] : ''].filter((s) => s?.trim()).join(' — ') || undefined
    const coords = url ? coordsFromUrl(url) : undefined
    out.push({ name, url, note, ...coords })
  }
  return { source: 'takeout-csv', rows: out, warnings }
}

function coordsFromUrl(url: string): { lat: number; lng: number } | undefined {
  // /maps/search/35.6586,139.7454 or ...!3d35.65!4d139.74
  const m1 = url.match(/\/maps\/search\/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  if (m1) return { lat: Number(m1[1]), lng: Number(m1[2]) }
  const m2 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m2) return { lat: Number(m2[1]), lng: Number(m2[2]) }
  return undefined
}

/** Takeout "Saved Places.json" (starred) is GeoJSON. Also accepts our own export. */
export function parseJson(text: string): ImportResult {
  const j = JSON.parse(text)
  if (j?.type === 'FeatureCollection' && Array.isArray(j.features)) {
    const rows: ImportRow[] = []
    for (const f of j.features) {
      const c = f?.geometry?.coordinates
      const p = f?.properties ?? {}
      const name: string = p.Title ?? p.title ?? p.name ?? p.Location?.['Business Name'] ?? p.Location?.Name ?? ''
      if (!name) continue
      rows.push({
        name,
        lng: Array.isArray(c) ? Number(c[0]) : undefined,
        lat: Array.isArray(c) ? Number(c[1]) : undefined,
        address: p.Location?.Address ?? p.address,
        url: p['Google Maps URL'] ?? p.url,
        note: p.Comment ?? p.note,
      })
    }
    return { source: 'takeout-geojson', rows, warnings: [] }
  }
  if (j?.places && typeof j.places === 'object') {
    const rows: ImportRow[] = Object.values(j.places as Record<string, ImportRow & { category?: CategoryId }>).map((p) => ({
      name: p.name, lat: p.lat, lng: p.lng, address: p.address, note: p.note, category: p.category,
    }))
    return { source: 'json', rows, warnings: [] }
  }
  throw new Error('Unrecognised JSON. Expected Takeout "Saved Places.json" or a Tokyo export.')
}

/** Google My Maps > Export to KML/KMZ. Folders become groups. */
export function parseKml(text: string): ImportResult {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Could not parse KML')
  const rows: ImportRow[] = []
  const placemarks = Array.from(doc.getElementsByTagName('Placemark'))
  for (const pm of placemarks) {
    const name = textOf(pm, 'name')
    const coordText = textOf(pm, 'coordinates')
    if (!name) continue
    let lat: number | undefined, lng: number | undefined
    if (coordText) {
      const [x, y] = coordText.trim().split(/\s+/)[0]!.split(',').map(Number)
      if (Number.isFinite(x) && Number.isFinite(y)) { lng = x; lat = y }
    }
    const description = textOf(pm, 'description')
    const address = textOf(pm, 'address') || dataValue(pm, 'address') || dataValue(pm, 'Address')
    let folder: string | undefined
    let parent = pm.parentElement
    while (parent) {
      if (parent.tagName === 'Folder') { folder = directChildText(parent, 'name'); break }
      parent = parent.parentElement
    }
    rows.push({ name, lat, lng, address: address || undefined, note: stripHtml(description) || undefined, folder })
  }
  return { source: 'kml', rows, warnings: placemarks.length ? [] : ['No placemarks found'] }
}

function textOf(el: Element, tag: string): string {
  const n = el.getElementsByTagName(tag)[0]
  return n?.textContent?.trim() ?? ''
}
function directChildText(el: Element, tag: string): string | undefined {
  for (const c of Array.from(el.children)) if (c.tagName === tag) return c.textContent?.trim()
  return undefined
}
function dataValue(el: Element, key: string): string {
  for (const d of Array.from(el.getElementsByTagName('Data'))) {
    if (d.getAttribute('name') === key) return textOf(d, 'value')
  }
  return ''
}
function stripHtml(s: string): string {
  return s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
}

/** Minimal RFC-4180 CSV parser (quotes, embedded newlines). */
export function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

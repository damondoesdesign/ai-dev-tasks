import { useEffect, useState } from 'react'

export type Tab = 'map' | 'places' | 'days' | 'settings'

export interface Route {
  path: string
  tab: Tab
  parts: string[]
  params: URLSearchParams
}

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [p, q = ''] = raw.split('?')
  const parts = p!.split('/').filter(Boolean)
  const first = parts[0] ?? 'map'
  let tab: Tab = 'map'
  if (first === 'places' || first === 'place' || first === 'add' || first === 'edit') tab = 'places'
  if (first === 'days') tab = 'days'
  if (first === 'settings') tab = 'settings'
  if (first === 'place' || first === 'edit') {
    // Remember which tab the sheet was opened from.
    const from = new URLSearchParams(q).get('from')
    if (from === 'map' || from === 'days' || from === 'places') tab = from
  }
  return { path: p!, tab, parts, params: new URLSearchParams(q) }
}

export function navigate(path: string, replace = false) {
  const h = `#/${path.replace(/^#?\/?/, '')}`
  if (replace) history.replaceState(null, '', h)
  else location.hash = h
  if (replace) dispatchEvent(new HashChangeEvent('hashchange'))
}

export function back(fallback = 'map') {
  if (history.length > 1) history.back()
  else navigate(fallback, true)
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parseRoute(location.hash))
  useEffect(() => {
    const h = () => setR(parseRoute(location.hash))
    addEventListener('hashchange', h)
    return () => removeEventListener('hashchange', h)
  }, [])
  return r
}

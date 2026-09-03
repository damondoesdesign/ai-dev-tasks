import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { getPosition, type LatLng } from '../lib/geo'
import { isPmtiles, mapCacheStatus } from '../lib/offline'
import { tilesUrl } from '../lib/config'
import { resolveTheme } from '../lib/theme'
import { navigate, useRoute } from '../state/router'
import { useStore } from '../state/store'
import FilterBar from './FilterBar'
import PlaceCard from './PlaceCard'
import { Icon, Spinner } from './ui'

const MapView = lazy(() => import('./MapView'))

export default function MapScreen() {
  const { visiblePlaces, data, theme, filters, days, online } = useStore()
  const route = useRoute()
  const selectedId = route.params.get('p')
  const [fitToken, setFit] = useState(0)
  const [flyToken, setFly] = useState(0)
  const [userPos, setUserPos] = useState<LatLng | null>(null)
  const [tilesOk, setTilesOk] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const dark = resolveTheme(theme) === 'dark'

  // Tiles are usable when a .pmtiles is cached, or we're online with a source configured.
  useEffect(() => {
    let alive = true
    mapCacheStatus().then((s) => { if (alive) setTilesOk(s.cached || (online && Boolean(tilesUrl))) })
    return () => { alive = false }
  }, [online])

  // Fit once places arrive.
  const count = Object.keys(data.places).length
  useEffect(() => { if (count) setFit((t) => t + 1) }, [count > 0]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (filters.day != null) setFit((t) => t + 1) }, [filters.day])
  useEffect(() => { if (selectedId) setFly((t) => t + 1) }, [selectedId])

  const order = useMemo(() => {
    if (filters.day == null) return null
    const m = new Map<string, number>()
    days[filters.day]?.items.forEach((it, i) => { if (!m.has(it.placeId)) m.set(it.placeId, i + 1) })
    return m
  }, [filters.day, days])

  // A place hidden by the current filters can't stay selected.
  const selected = selectedId && visiblePlaces.some((p) => p.id === selectedId) ? data.places[selectedId] ?? null : null
  useEffect(() => { if (selectedId && !selected && count) navigate('map', true) }, [selectedId, selected, count])
  const select = (id: string | null) => navigate(id ? `map?p=${id}` : 'map', true)

  const locate = async () => {
    const p = await getPosition()
    if (p) setUserPos(p)
  }

  return (
    <div className="screen">
      <Suspense fallback={<div className="center"><Spinner /></div>}>
        <MapView
          places={visiblePlaces} selectedId={selectedId} onSelect={select} dark={dark} order={order}
          center={data.trip.center} fitToken={fitToken} flyToken={flyToken} userPos={userPos} tilesOk={tilesOk} onTilesFailed={() => setTilesOk(false)}
        />
      </Suspense>
      <div className="map-top">
        {filtersOpen && <FilterBar />}
        {!tilesOk && (
          <div className="banner warn" style={{ margin: '0 12px', borderRadius: 10 }}>
            {isPmtiles() ? 'Offline map not downloaded yet · Settings → Offline' : 'No map tiles configured'}
          </div>
        )}
      </div>
      <div className="map-fabs" style={{ bottom: selected ? 150 : 16 }}>
        <button className={`iconbtn${filtersOpen ? ' on' : ''}`} onClick={() => setFiltersOpen((v) => !v)} aria-label="Filters"><Icon.Layers /></button>
        <button className="iconbtn" onClick={() => setFit((t) => t + 1)} aria-label="Fit all"><Icon.Pin /></button>
        <button className="iconbtn" onClick={locate} aria-label="My location"><Icon.Locate /></button>
      </div>
      {selected && <PlaceCard place={selected} onClose={() => select(null)} from="map" />}
    </div>
  )
}

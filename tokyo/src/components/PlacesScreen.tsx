import { useMemo, useState } from 'react'
import { CATEGORIES } from '../model/categories'
import type { Place } from '../model/types'
import { navigate } from '../state/router'
import { useStore } from '../state/store'
import FilterBar from './FilterBar'
import PlaceRow from './PlaceRow'
import { Icon, Segmented } from './ui'

type Sort = 'category' | 'group' | 'az'

export default function PlacesScreen() {
  const { visiblePlaces, filters, setFilters, isEditor, data, sortedGroups } = useStore()
  const [sort, setSort] = useState<Sort>('category')
  const total = Object.keys(data.places).length

  const sections = useMemo(() => {
    if (sort === 'az') return [{ key: 'all', title: '', places: visiblePlaces }]
    if (sort === 'group') {
      const out = sortedGroups.map((g) => ({ key: g.id, title: g.name, places: visiblePlaces.filter((p) => p.groupIds.includes(g.id)) }))
      const none = visiblePlaces.filter((p) => p.groupIds.length === 0)
      if (none.length) out.push({ key: '_none', title: 'No group', places: none })
      return out.filter((s) => s.places.length)
    }
    return CATEGORIES.map((c) => ({ key: c.id, title: c.label, places: visiblePlaces.filter((p) => p.category === c.id) })).filter((s) => s.places.length)
  }, [sort, visiblePlaces, sortedGroups])

  const open = (p: Place) => navigate(`place/${p.id}?from=places`)

  return (
    <div className="screen scroll">
      <div className="screen-head">
        <div>
          <div className="eyebrow">{visiblePlaces.length === total ? `${total} places` : `${visiblePlaces.length} of ${total}`}</div>
          <h1>Places</h1>
        </div>
        {isEditor && <button className="btn sm" onClick={() => navigate('add')}><Icon.Plus />Add</button>}
      </div>
      <div className="pad" style={{ paddingBottom: 10 }}>
        <div className="search">
          <Icon.Search />
          <input className="input" placeholder="Search places, notes, addresses" value={filters.query} onChange={(e) => setFilters({ query: e.target.value })} />
        </div>
      </div>
      <FilterBar />
      <div className="pad hstack" style={{ justifyContent: 'space-between', padding: '12px 18px 0' }}>
        <Segmented value={sort} onChange={setSort} options={[{ value: 'category', label: 'Category' }, { value: 'group', label: 'Group' }, { value: 'az', label: 'A–Z' }]} />
      </div>
      {total === 0 && (
        <div className="empty">
          <h2>No places yet</h2>
          {isEditor ? <p>Tap Add to search Google for a restaurant, shop or park, or import your Google Maps lists from Settings.</p> : <p>The editor hasn't added anything yet.</p>}
        </div>
      )}
      {total > 0 && visiblePlaces.length === 0 && <div className="empty"><p>Nothing matches these filters.</p></div>}
      {sections.map((s) => (
        <div key={s.key}>
          {s.title && <div className="section"><h3>{s.title}</h3><span className="tiny faint num">{s.places.length}</span></div>}
          <div className="list">{s.places.map((p) => <PlaceRow key={p.id} place={p} onClick={() => open(p)} />)}</div>
        </div>
      ))}
    </div>
  )
}

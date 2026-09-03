import { CATEGORIES } from '../model/categories'
import type { CategoryId } from '../model/types'
import { useStore } from '../state/store'

export default function FilterBar({ showDays = true }: { showDays?: boolean }) {
  const { filters, setFilters, sortedGroups, days, data } = useStore()
  const allOn = filters.categories.size === CATEGORIES.length
  const counts = new Map<CategoryId, number>()
  for (const p of Object.values(data.places)) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)

  const toggleCat = (id: CategoryId) => setFilters((f) => {
    const next = new Set(f.categories)
    if (allOn) { next.clear(); next.add(id) } // first tap isolates
    else if (next.has(id)) { next.delete(id); if (next.size === 0) CATEGORIES.forEach((c) => next.add(c.id)) }
    else next.add(id)
    return { ...f, categories: next }
  })
  const toggleGroup = (id: string) => setFilters((f) => {
    const next = new Set(f.groups)
    if (next.has(id)) next.delete(id); else next.add(id)
    return { ...f, groups: next }
  })

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="chiprow">
        <button className={`chip${allOn ? ' on' : ''}`} onClick={() => setFilters((f) => ({ ...f, categories: new Set(CATEGORIES.map((c) => c.id)) }))}>All</button>
        {CATEGORIES.filter((c) => counts.get(c.id)).map((c) => (
          <button key={c.id} className={`chip${!allOn && filters.categories.has(c.id) ? ' on' : ''}`} onClick={() => toggleCat(c.id)}>
            <span className="mark">{c.mark}</span>{c.label}
          </button>
        ))}
      </div>
      {(sortedGroups.length > 0 || showDays) && (
        <div className="chiprow">
          {showDays && (
            <select
              className="chip"
              style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 12, border: 0 }}
              value={filters.day == null ? '' : String(filters.day)}
              onChange={(e) => setFilters({ day: e.target.value === '' ? null : Number(e.target.value) })}
              aria-label="Filter by day"
            >
              <option value="">All days</option>
              {days.map((d) => <option key={d.id} value={d.index}>Day {d.index + 1}{d.title ? ` · ${d.title}` : ''}</option>)}
            </select>
          )}
          {sortedGroups.map((g) => (
            <button key={g.id} className={`chip accent${filters.groups.has(g.id) ? ' on' : ''}`} onClick={() => toggleGroup(g.id)}>{g.name}</button>
          ))}
        </div>
      )}
    </div>
  )
}

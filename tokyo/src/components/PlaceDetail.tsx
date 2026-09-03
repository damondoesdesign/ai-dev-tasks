import { useState } from 'react'
import { fmtLongDate, hoursToday } from '../lib/dates'
import { googlePlaceUrl, openExternal } from '../lib/directions'
import { CATEGORIES, CATEGORY_MAP } from '../model/categories'
import type { Place } from '../model/types'
import { back, navigate } from '../state/router'
import { useStore } from '../state/store'
import DirectionsButton from './DirectionsButton'
import DayPicker from './DayPicker'
import { confirmDialog, Icon, Menu, Sheet } from './ui'

export default function PlaceDetail({ place, from }: { place: Place; from: string }) {
  const { isEditor, deletePlace, data, daysFor, addToDay, sortedGroups, setFilters } = useStore()
  const [menu, setMenu] = useState(false)
  const [pick, setPick] = useState(false)
  const [allHours, setAllHours] = useState(false)
  const cat = CATEGORY_MAP[place.category]
  const today = hoursToday(place.hours)
  const onDays = daysFor(place.id)
  const groups = place.groupIds.map((g) => data.groups[g]).filter(Boolean)
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const showOnMap = () => {
    // Clear anything that would hide this place, then select it.
    setFilters({ day: null, groups: new Set(), categories: new Set(CATEGORIES.map((c) => c.id)) })
    navigate(`map?p=${place.id}`)
  }

  return (
    <Sheet
      onClose={() => back(from)}
      right={isEditor ? <button className="iconbtn" onClick={() => setMenu(true)} aria-label="More"><Icon.More /></button> : undefined}
      foot={<><DirectionsButton place={place} /><button className="btn ghost" onClick={showOnMap}><Icon.Map />Map</button></>}
    >
      {place.photos.length > 0 && <div className="photos">{place.photos.map((u) => <img key={u} src={u} alt="" loading="lazy" />)}</div>}
      <div className="hero">
        <div className="eyebrow">{cat.label}{place.primaryType && place.primaryType !== cat.label ? ` · ${place.primaryType}` : ''}{place.priceLevel ? ` · ${place.priceLevel}` : ''}</div>
        <h1>{place.name}</h1>
        {place.nameJa && <div className="muted">{place.nameJa}</div>}
        <div className="pills" style={{ marginTop: 10 }}>
          {onDays.map((d) => <button key={d} className="pill ink" onClick={() => { setFilters({ day: d }); navigate(`days/${d}`) }}>Day {d + 1}</button>)}
          {groups.map((g) => <span key={g!.id} className="pill accent">{g!.name}</span>)}
          {place.booked && <span className="pill">Booked</span>}
          {place.rating != null && <span className="pill num">★ {place.rating.toFixed(1)}{place.ratingCount ? ` (${place.ratingCount.toLocaleString()})` : ''}</span>}
        </div>
      </div>

      <div className="pad stack" style={{ gap: 18, paddingTop: 8 }}>
        {place.notes && <div className="note">{place.notes}</div>}
        {place.description && <p style={{ fontSize: 15, lineHeight: 1.5 }}>{place.description}</p>}

        {place.hours && place.hours.length > 0 && (
          <div>
            <button className="hstack" style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => setAllHours((v) => !v)}>
              <h3>Hours</h3>
              <span className="small muted">{today ? `Today ${today}` : 'See all'}</span>
            </button>
            {allHours && (
              <ul className="hours" style={{ marginTop: 8 }}>
                {place.hours.map((h) => {
                  const [d, ...rest] = h.split(': ')
                  return <li key={h} className={d === todayName ? 'today' : ''}><span>{d}</span><span className="num">{rest.join(': ')}</span></li>
                })}
              </ul>
            )}
          </div>
        )}

        <dl className="kv">
          {place.address && <><dt>Address</dt><dd>{place.address}</dd></>}
          {place.phone && <><dt>Phone</dt><dd><a href={`tel:${place.phone.replace(/\s/g, '')}`}>{place.phone}</a></dd></>}
          {place.website && <><dt>Website</dt><dd><a href={place.website} target="_blank" rel="noopener" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{hostOf(place.website)}</a></dd></>}
        </dl>

        <div className="hstack" style={{ flexWrap: 'wrap' }}>
          <button className="btn line sm" onClick={() => openExternal(googlePlaceUrl(place))}><Icon.Link />Google Maps</button>
          {isEditor && <button className="btn line sm" onClick={() => setPick(true)}><Icon.Days />Add to a day</button>}
          {isEditor && <button className="btn line sm" onClick={() => navigate(`edit/${place.id}?from=${from}`)}><Icon.Edit />Edit</button>}
        </div>
        {onDays.length > 0 && (
          <div className="small muted">
            Scheduled {onDays.map((d) => `${fmtLongDate(data.trip.startDate, d)}`).join(' and ')}.
          </div>
        )}
      </div>

      {menu && (
        <Menu onClose={() => setMenu(false)} items={[
          { label: 'Edit place', icon: <Icon.Edit />, onClick: () => navigate(`edit/${place.id}?from=${from}`) },
          { label: 'Add to a day', icon: <Icon.Days />, onClick: () => setPick(true) },
          { label: 'Delete place', danger: true, icon: <Icon.Close />, onClick: async () => { if (confirmDialog(`Delete “${place.name}”?`)) { await deletePlace(place.id); back(from) } } },
        ]} />
      )}
      {pick && <DayPicker onClose={() => setPick(false)} onPick={async (d) => { await addToDay(d, place.id); setPick(false) }} />}
      {sortedGroups.length === 0 && null}
    </Sheet>
  )
}

function hostOf(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u }
}

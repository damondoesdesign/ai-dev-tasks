import { hoursToday } from '../lib/dates'
import { CATEGORY_MAP } from '../model/categories'
import type { Place } from '../model/types'
import { navigate } from '../state/router'
import { useStore } from '../state/store'
import DirectionsButton from './DirectionsButton'
import { Icon } from './ui'

export default function PlaceCard({ place, onClose, from }: { place: Place; onClose: () => void; from: string }) {
  const { daysFor } = useStore()
  const cat = CATEGORY_MAP[place.category]
  const today = hoursToday(place.hours)
  const onDays = daysFor(place.id)
  return (
    <div className="placecard">
      <button className="head" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`place/${place.id}?from=${from}`)}>
        {place.photos[0] ? <img className="thumb" src={place.photos[0]} alt="" /> : <div className="thumb" style={{ display: 'grid', placeItems: 'center' }}><span className="mark lg">{cat.mark}</span></div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">{cat.label}{onDays.length ? ` · Day ${onDays.map((d) => d + 1).join(', ')}` : ''}</div>
          <h2 style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</h2>
          <div className="small muted" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {today ? `Today ${today}` : place.address ?? ''}
          </div>
        </div>
        <span className="iconbtn plain" style={{ marginRight: -8 }} aria-hidden><Icon.Chevron /></span>
      </button>
      <div className="actions">
        <DirectionsButton place={place} />
        <button className="btn ghost" onClick={() => navigate(`place/${place.id}?from=${from}`)}>Details</button>
        <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon.Close /></button>
      </div>
    </div>
  )
}

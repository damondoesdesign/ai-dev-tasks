import { hoursToday } from '../lib/dates'
import { CATEGORY_MAP } from '../model/categories'
import type { Place } from '../model/types'
import { Icon } from './ui'

export default function PlaceRow({ place, onClick, right, sub }: { place: Place; onClick?: () => void; right?: React.ReactNode; sub?: string }) {
  const cat = CATEGORY_MAP[place.category]
  const today = hoursToday(place.hours)
  const subtitle = sub ?? [cat.label, today ? `Today ${today}` : place.primaryType].filter(Boolean).join(' · ')
  return (
    <button className="row" onClick={onClick}>
      {place.photos[0]
        ? <img className="thumb" src={place.photos[0]} alt="" loading="lazy" />
        : <div className="thumb empty"><span className="mark lg">{cat.mark}</span></div>}
      <div className="body">
        <div className="title">{place.name}</div>
        <div className="sub">{subtitle}</div>
      </div>
      {right ?? <span className="faint" style={{ display: 'inline-flex' }}><Icon.Chevron /></span>}
    </button>
  )
}

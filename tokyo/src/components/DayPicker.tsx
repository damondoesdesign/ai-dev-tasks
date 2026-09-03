import { fmtDayDate } from '../lib/dates'
import { useStore } from '../state/store'
import { Sheet } from './ui'

export default function DayPicker({ onPick, onClose, title = 'Add to a day', exclude }: { onPick: (day: number) => void; onClose: () => void; title?: string; exclude?: number }) {
  const { days, data } = useStore()
  return (
    <Sheet half onClose={onClose} title={title}>
      <div className="list">
        {days.map((d) => {
          const f = fmtDayDate(data.trip.startDate, d.index)
          return (
            <button key={d.id} className="row" disabled={d.index === exclude} style={{ opacity: d.index === exclude ? 0.4 : 1 }} onClick={() => onPick(d.index)}>
              <div style={{ width: 44, textAlign: 'center' }}>
                <div className="tiny muted" style={{ fontWeight: 700, letterSpacing: '.06em' }}>{f.weekday.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{f.date}</div>
              </div>
              <div className="body">
                <div className="title">Day {d.index + 1}{d.title ? ` · ${d.title}` : ''}</div>
                <div className="sub">{d.items.length ? `${d.items.length} stop${d.items.length === 1 ? '' : 's'}` : 'Nothing planned'}</div>
              </div>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

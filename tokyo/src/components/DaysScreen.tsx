import { closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToVerticalAxis } from './dndModifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import { fmtDayDate, fmtLongDate, fmtTime, todayIndex } from '../lib/dates'
import { distanceM, formatDistance, walkMinutes } from '../lib/geo'
import { CATEGORY_MAP } from '../model/categories'
import type { Day, DayItem, Place } from '../model/types'
import { navigate, useRoute } from '../state/router'
import { useStore } from '../state/store'
import DayPicker from './DayPicker'
import PlaceRow from './PlaceRow'
import { Field, Icon, Menu, Sheet } from './ui'

export default function DaysScreen() {
  const { days, data, isEditor, setFilters, reorderDay, removeFromDay, moveItem, addToDay, saveDay, updateItem } = useStore()
  const route = useRoute()
  const today = todayIndex(data.trip.startDate, data.trip.numDays)
  const routeDay = route.parts[1] != null ? Number(route.parts[1]) : NaN
  const [sel, setSel] = useState<number>(Number.isFinite(routeDay) ? routeDay : (today ?? 0))
  useEffect(() => { if (Number.isFinite(routeDay)) setSel(routeDay) }, [routeDay])
  const day: Day = days[sel] ?? days[0]!
  const [menuItem, setMenuItem] = useState<DayItem | null>(null)
  const [moving, setMoving] = useState<DayItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<DayItem | null>(null)
  const [editingDay, setEditingDay] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  )
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = day.items.map((i) => i.id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    reorderDay(day.index, next)
  }

  const f = fmtDayDate(data.trip.startDate, day.index)
  const showOnMap = () => { setFilters({ day: day.index }); navigate('map') }
  const items = day.items.map((it) => ({ it, place: data.places[it.placeId] })).filter((x) => x.place) as { it: DayItem; place: Place }[]

  return (
    <div className="screen scroll">
      <div className="screen-head" style={{ paddingBottom: 4 }}>
        <div>
          <div className="eyebrow">{data.trip.name} · {data.trip.numDays} days</div>
          <h1>Itinerary</h1>
        </div>
        <button className="btn sm ghost" onClick={showOnMap}><Icon.Map />Map</button>
      </div>
      <div className="daystrip">
        {days.map((d) => {
          const df = fmtDayDate(data.trip.startDate, d.index)
          return (
            <button key={d.id} className={`daybtn${d.index === sel ? ' on' : ''}${d.index === today ? ' today' : ''}`} onClick={() => { setSel(d.index); navigate(`days/${d.index}`, true) }}>
              <span className="w">{df.weekday}</span>
              <span className="d num">{df.date}</span>
              <span className={`dot${d.items.length ? '' : ' hidden'}`} />
            </button>
          )
        })}
      </div>

      <div className="pad" style={{ paddingTop: 8, paddingBottom: 12 }}>
        <div className="hstack" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">Day {day.index + 1} · {f.weekday} {f.month} {f.date}{day.index === today ? ' · Today' : ''}</div>
            <h2 style={{ marginTop: 2 }}>{day.title || 'Untitled day'}</h2>
            {day.note && <p className="small muted" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{day.note}</p>}
          </div>
          {isEditor && <button className="iconbtn" onClick={() => setEditingDay(true)} aria-label="Edit day"><Icon.Edit /></button>}
        </div>
      </div>

      {items.length === 0 && (
        <div className="empty">
          <h2>Nothing planned</h2>
          <p>{isEditor ? 'Add places to build the day. Drag the handle to reorder.' : `Free day: ${fmtLongDate(data.trip.startDate, day.index)}.`}</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={items.map((x) => x.it.id)} strategy={verticalListSortingStrategy}>
          <div className="list">
            {items.map(({ it, place }, i) => {
              const prev = items[i - 1]?.place
              const d = prev ? distanceM(prev, place) : null
              return (
                <div key={it.id}>
                  {d != null && <div className="leg">{d < 1400 ? `walk ${walkMinutes(d)} min` : `${formatDistance(d)} · train`}</div>}
                  <SortableRow item={it} index={i} place={place} editable={isEditor}
                    onOpen={() => navigate(`place/${place.id}?from=days`)}
                    onMore={() => setMenuItem(it)} />
                </div>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {isEditor && (
        <div className="pad" style={{ paddingTop: 16 }}>
          <button className="btn line block" onClick={() => setAdding(true)}><Icon.Plus />Add a place to Day {day.index + 1}</button>
        </div>
      )}

      {menuItem && (
        <Menu title={data.places[menuItem.placeId]?.name} onClose={() => setMenuItem(null)} items={[
          { label: 'Set time & note', icon: <Icon.Edit />, onClick: () => setEditingItem(menuItem) },
          { label: 'Move to another day', icon: <Icon.Days />, onClick: () => setMoving(menuItem) },
          { label: 'Remove from this day', danger: true, icon: <Icon.Close />, onClick: () => removeFromDay(day.index, menuItem.id) },
        ]} />
      )}
      {moving && <DayPicker title="Move to" exclude={day.index} onClose={() => setMoving(null)} onPick={async (d) => { await moveItem(day.index, moving.id, d); setMoving(null) }} />}
      {adding && <AddPlacePicker onClose={() => setAdding(false)} onPick={async (id) => { await addToDay(day.index, id); setAdding(false) }} />}
      {editingItem && (
        <ItemEditor item={editingItem} place={data.places[editingItem.placeId]} onClose={() => setEditingItem(null)}
          onSave={async (patch) => { await updateItem(day.index, editingItem.id, patch); setEditingItem(null) }} />
      )}
      {editingDay && <DayEditor day={day} onClose={() => setEditingDay(false)} onSave={async (d) => { await saveDay(d); setEditingDay(false) }} />}
    </div>
  )
}

function SortableRow({ item, index, place, editable, onOpen, onMore }: { item: DayItem; index: number; place: Place; editable: boolean; onOpen: () => void; onMore: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editable })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const cat = CATEGORY_MAP[place.category]
  return (
    <div ref={setNodeRef} style={style} className={`dayitem${isDragging ? ' dragging' : ''}`}>
      <span className="idx num">{index + 1}</span>
      <span className="time">{fmtTime(item.time)}</span>
      <button className="body" style={{ flex: 1, minWidth: 0, textAlign: 'left' }} onClick={onOpen}>
        <div className="title" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
        <div className="sub small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note || cat.label}</div>
      </button>
      {editable && <button className="iconbtn plain" onClick={onMore} aria-label="More"><Icon.More /></button>}
      {editable && <span ref={setActivatorNodeRef} className="handle" {...attributes} {...listeners} aria-label="Drag to reorder"><Icon.Drag /></span>}
    </div>
  )
}

function AddPlacePicker({ onPick, onClose }: { onPick: (placeId: string) => void; onClose: () => void }) {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const list = useMemo(() => Object.values(data.places).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [data.places, q])
  return (
    <Sheet half onClose={onClose} title="Add place">
      <div className="pad" style={{ paddingBottom: 8 }}>
        <div className="search"><Icon.Search /><input className="input" autoFocus placeholder="Search saved places" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="list">
        {list.map((p) => <PlaceRow key={p.id} place={p} onClick={() => onPick(p.id)} right={<span className="faint" style={{ display: 'inline-flex' }}><Icon.Plus /></span>} />)}
        {list.length === 0 && <div className="empty"><p>No saved places match. Add it from the Places tab first.</p></div>}
      </div>
    </Sheet>
  )
}

function ItemEditor({ item, place, onSave, onClose }: { item: DayItem; place?: Place; onSave: (patch: Partial<DayItem>) => void; onClose: () => void }) {
  const [time, setTime] = useState(item.time ?? '')
  const [note, setNote] = useState(item.note ?? '')
  return (
    <Sheet half onClose={onClose} title={place?.name ?? 'Stop'} foot={<button className="btn block" onClick={() => onSave({ time: time || undefined, note: note.trim() || undefined })}>Save</button>}>
      <div className="pad stack" style={{ gap: 14, paddingBottom: 12 }}>
        <Field label="Time"><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Note"><input className="input" placeholder="Reservation at 7, bring cash…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Sheet>
  )
}

function DayEditor({ day, onSave, onClose }: { day: Day; onSave: (d: Day) => void; onClose: () => void }) {
  const [title, setTitle] = useState(day.title ?? '')
  const [note, setNote] = useState(day.note ?? '')
  return (
    <Sheet half onClose={onClose} title={`Day ${day.index + 1}`} foot={<button className="btn block" onClick={() => onSave({ ...day, title: title.trim() || undefined, note: note.trim() || undefined })}>Save</button>}>
      <div className="pad stack" style={{ gap: 14, paddingBottom: 12 }}>
        <Field label="Title"><input className="input" placeholder="Shimokitazawa & Setagaya" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Note"><textarea className="input" placeholder="Start slow, lunch is booked for 1pm…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Sheet>
  )
}

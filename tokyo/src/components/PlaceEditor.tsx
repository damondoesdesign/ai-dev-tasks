import { useEffect, useRef, useState } from 'react'
import { hasPlaces } from '../lib/config'
import { newId } from '../lib/ids'
import { fetchPlaceDetails, searchPlaces, type SearchHit } from '../lib/places'
import { CATEGORIES, categoryFromTypes } from '../model/categories'
import type { CategoryId, Place } from '../model/types'
import { back, navigate } from '../state/router'
import { useStore } from '../state/store'
import { Field, Icon, Sheet, Spinner, Switch } from './ui'

/**
 * Add (search Google, pick, tweak, save) or edit an existing place.
 * Without a Places key you can still add a place by name and coordinates.
 */
export default function PlaceEditor({ existing, from }: { existing?: Place; from: string }) {
  const { savePlace, sortedGroups, data, online, addToDay } = useStore()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState<Place | null>(existing ?? null)
  const [addDay, setAddDay] = useState<number | ''>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const canSearch = hasPlaces && online

  useEffect(() => { if (!existing) inputRef.current?.focus() }, [existing])

  const search = async () => {
    if (!q.trim()) return
    setErr(null); setSearching(true)
    try { setHits(await searchPlaces(q, data.trip.center)) }
    catch (e) { setErr((e as Error).message) }
    finally { setSearching(false) }
  }

  const pick = async (h: SearchHit) => {
    setErr(null); setLoading(true)
    try {
      const p = await fetchPlaceDetails(h.id, { id: draft?.id ?? existing?.id, groupIds: draft?.groupIds ?? [], notes: draft?.notes, createdAt: existing?.createdAt })
      setDraft(p); setHits(null)
    } catch (e) {
      // Fall back to what search gave us.
      setDraft(blank({ name: h.name, lat: h.lat, lng: h.lng, address: h.address, googlePlaceId: h.id, category: categoryFromTypes(h.types, h.primaryType) }))
      setErr(`Details unavailable: ${(e as Error).message}`)
    } finally { setLoading(false) }
  }

  const manual = () => setDraft(blank({ name: q.trim() || 'New place', lat: data.trip.center.lat, lng: data.trip.center.lng }))

  const refresh = async () => {
    if (!draft?.googlePlaceId) return
    setLoading(true); setErr(null)
    try { setDraft(await fetchPlaceDetails(draft.googlePlaceId, draft)) }
    catch (e) { setErr((e as Error).message) }
    finally { setLoading(false) }
  }

  const save = async () => {
    if (!draft) return
    const p: Place = { ...draft, name: draft.name.trim() || 'Untitled', updatedAt: Date.now() }
    await savePlace(p)
    if (addDay !== '') await addToDay(Number(addDay), p.id)
    if (existing) back(from); else navigate(`place/${p.id}?from=${from}`, true)
  }

  const set = (patch: Partial<Place>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const toggleGroup = (id: string) => setDraft((d) => {
    if (!d) return d
    const has = d.groupIds.includes(id)
    return { ...d, groupIds: has ? d.groupIds.filter((g) => g !== id) : [...d.groupIds, id] }
  })

  return (
    <Sheet
      onClose={() => back(from)}
      title={existing ? 'Edit place' : 'Add place'}
      foot={draft ? <button className="btn block" onClick={save} disabled={loading || !draft.name.trim()}><Icon.Check />Save</button> : undefined}
    >
      {!draft && (
        <div className="pad stack" style={{ paddingTop: 6 }}>
          <div className="search">
            <Icon.Search />
            <input ref={inputRef} className="input" placeholder={canSearch ? 'Restaurant, shop, park… or paste a Google Maps link' : 'Place name'} value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (canSearch) search(); else manual() } }} enterKeyHint="search" />
          </div>
          {canSearch
            ? <button className="btn block" onClick={search} disabled={searching || !q.trim()}>{searching ? <Spinner /> : <><Icon.Search />Search Google</>}</button>
            : <div className="banner" style={{ borderRadius: 10 }}>{!online ? 'Offline: Google search needs a connection.' : 'Add a Google Places key to search and auto-fill photos, hours and addresses.'}</div>}
          {err && <div className="err">{err}</div>}
          {hits && (
            <div className="list" style={{ margin: '0 -18px' }}>
              {hits.length === 0 && <div className="empty"><p>No results. Try adding the neighbourhood, e.g. “Fuglen Shibuya”.</p></div>}
              {hits.map((h) => (
                <button key={h.id} className="row" onClick={() => pick(h)}>
                  <span className="mark">{CATEGORIES.find((c) => c.id === categoryFromTypes(h.types, h.primaryType))?.mark}</span>
                  <div className="body"><div className="title">{h.name}</div><div className="sub">{h.address}</div></div>
                  {loading ? <Spinner /> : <Icon.Chevron />}
                </button>
              ))}
            </div>
          )}
          <button className="btn line block" onClick={manual}>Add manually{q.trim() ? ` · “${q.trim()}”` : ''}</button>
        </div>
      )}

      {draft && (
        <div className="pad stack" style={{ paddingTop: 6, gap: 16 }}>
          {loading && <div className="hstack"><Spinner /><span className="small muted">Fetching from Google…</span></div>}
          {err && <div className="err">{err}</div>}
          {draft.photos.length > 0 && <div className="photos" style={{ margin: '0 -18px' }}>{draft.photos.map((u) => <img key={u} src={u} alt="" style={{ height: 150, minWidth: '48%' }} />)}</div>}
          <Field label="Name"><input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Category">
            <div className="chiprow" style={{ margin: '0 -18px' }}>
              {CATEGORIES.map((c) => <button key={c.id} className={`chip${draft.category === c.id ? ' on' : ''}`} onClick={() => set({ category: c.id as CategoryId })}><span className="mark">{c.mark}</span>{c.label}</button>)}
            </div>
          </Field>
          {sortedGroups.length > 0 && (
            <Field label="Groups">
              <div className="chiprow" style={{ margin: '0 -18px' }}>
                {sortedGroups.map((g) => <button key={g.id} className={`chip accent${draft.groupIds.includes(g.id) ? ' on' : ''}`} onClick={() => toggleGroup(g.id)}>{g.name}</button>)}
              </div>
            </Field>
          )}
          <Field label="Notes for the group"><textarea className="input" placeholder="What to order, when to go, reservation details…" value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
          <Field label="Description"><textarea className="input" value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></Field>
          <div className="hstack" style={{ justifyContent: 'space-between' }}><span>Booked / ticketed</span><Switch on={Boolean(draft.booked)} onChange={(v) => set({ booked: v })} label="Booked" /></div>
          {!existing && (
            <Field label="Add to a day (optional)">
              <select className="input" value={addDay} onChange={(e) => setAddDay(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Not scheduled</option>
                {Array.from({ length: data.trip.numDays }, (_, i) => <option key={i} value={i}>Day {i + 1}</option>)}
              </select>
            </Field>
          )}
          <details>
            <summary className="small muted" style={{ cursor: 'pointer' }}>Address, coordinates, links</summary>
            <div className="stack" style={{ marginTop: 10 }}>
              <Field label="Address"><input className="input" value={draft.address ?? ''} onChange={(e) => set({ address: e.target.value })} /></Field>
              <div className="hstack">
                <Field label="Latitude"><input className="input num" inputMode="decimal" value={draft.lat} onChange={(e) => set({ lat: Number(e.target.value) || 0 })} /></Field>
                <Field label="Longitude"><input className="input num" inputMode="decimal" value={draft.lng} onChange={(e) => set({ lng: Number(e.target.value) || 0 })} /></Field>
              </div>
              <Field label="Website"><input className="input" inputMode="url" value={draft.website ?? ''} onChange={(e) => set({ website: e.target.value })} /></Field>
              <Field label="Hours (one line per day)"><textarea className="input" value={(draft.hours ?? []).join('\n')} onChange={(e) => set({ hours: e.target.value.split('\n').filter(Boolean) })} /></Field>
              <Field label="Photo URLs (one per line)"><textarea className="input" value={draft.photos.join('\n')} onChange={(e) => set({ photos: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} /></Field>
            </div>
          </details>
          <div className="hstack">
            {draft.googlePlaceId && canSearch && <button className="btn line sm" onClick={refresh} disabled={loading}>Refresh from Google</button>}
            {!existing && <button className="btn line sm" onClick={() => { setDraft(null); setHits(null) }}>Start over</button>}
          </div>
        </div>
      )}
    </Sheet>
  )
}

function blank(p: Partial<Place>): Place {
  const now = Date.now()
  return { id: newId('p'), name: '', category: 'other', groupIds: [], lat: 0, lng: 0, photos: [], createdAt: now, updatedAt: now, ...p }
}

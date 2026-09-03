import { useEffect, useRef, useState } from 'react'
import { appVersion, hasFirebase, hasPlaces } from '../lib/config'
import { newId } from '../lib/ids'
import { parseImportFile, type ImportResult, type ImportRow } from '../lib/importers'
import { deleteMapCache, downloadMap, fmtBytes, isPmtiles, mapCacheStatus, syncPhotos, type MapCacheStatus, type PhotoSyncProgress } from '../lib/offline'
import { fetchPlaceDetails, searchPlaces } from '../lib/places'
import { CATEGORIES } from '../model/categories'
import type { CategoryId, Group, Place, Role, Theme, Trip, TripData } from '../model/types'
import { sampleData } from '../model/sample'
import { useStore } from '../state/store'
import { confirmDialog, Field, Icon, Segmented, Sheet, Spinner } from './ui'

type Panel = null | 'people' | 'groups' | 'trip' | 'import' | 'password'

export default function SettingsScreen() {
  const { me, isEditor, theme, setTheme, signOut, updateMe, data, users, repo, replaceAll } = useStore()
  const [panel, setPanel] = useState<Panel>(null)
  const [name, setName] = useState(me?.name ?? '')
  useEffect(() => { setName(me?.name ?? '') }, [me?.name])
  const placeCount = Object.keys(data.places).length

  return (
    <div className="screen scroll">
      <div className="screen-head"><div><div className="eyebrow">{me?.role === 'editor' ? 'Editor' : 'Viewer'}</div><h1>Settings</h1></div></div>

      <div className="section"><h3>You</h3></div>
      <div className="pad stack">
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (name.trim() && name.trim() !== me?.name) updateMe({ name: name.trim() }) }} />
        </Field>
        <div className="hstack" style={{ justifyContent: 'space-between' }}>
          <span>Appearance</span>
          <Segmented<Theme> value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Auto' }]} />
        </div>
        <div className="small muted">{me?.email}{hasFirebase ? '' : ' · local mode'}</div>
        <div className="hstack">
          {hasFirebase && <button className="btn line sm" onClick={() => setPanel('password')}>Change password</button>}
          <button className="btn line sm" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <OfflineSection />

      {isEditor && (
        <>
          <div className="section"><h3>Trip</h3></div>
          <div className="list">
            <button className="row" onClick={() => setPanel('trip')}><div className="body"><div className="title">Dates & name</div><div className="sub">{data.trip.name} · {data.trip.numDays} days from {data.trip.startDate}</div></div><Icon.Chevron /></button>
            <button className="row" onClick={() => setPanel('groups')}><div className="body"><div className="title">Groups</div><div className="sub">{Object.keys(data.groups).length ? Object.values(data.groups).map((g) => g.name).join(', ') : 'Custom collections like “Must do” or “Rainy day”'}</div></div><Icon.Chevron /></button>
            <button className="row" onClick={() => setPanel('people')}><div className="body"><div className="title">People</div><div className="sub">{Object.keys(users).length} account{Object.keys(users).length === 1 ? '' : 's'}</div></div><Icon.Chevron /></button>
            <button className="row" onClick={() => setPanel('import')}><div className="body"><div className="title">Import from Google Maps</div><div className="sub">Saved lists (Takeout) or My Maps (KML)</div></div><Icon.Chevron /></button>
            <button className="row" onClick={() => exportJson(data)}><div className="body"><div className="title">Export backup</div><div className="sub">{placeCount} places as JSON</div></div><Icon.Download /></button>
            {placeCount === 0 && <button className="row" onClick={() => replaceAll(sampleData())}><div className="body"><div className="title">Load starter places</div><div className="sub">17 well-known spots and three sample days to play with</div></div><Icon.Plus /></button>}
          </div>
        </>
      )}

      <div className="pad tiny faint" style={{ paddingTop: 24 }}>
        Tokyo {appVersion} · {repo?.kind === 'firebase' ? 'Synced' : 'Local'} · Places lookup {hasPlaces ? 'on' : 'off'}
      </div>

      {panel === 'people' && <PeoplePanel onClose={() => setPanel(null)} />}
      {panel === 'groups' && <GroupsPanel onClose={() => setPanel(null)} />}
      {panel === 'trip' && <TripPanel onClose={() => setPanel(null)} />}
      {panel === 'import' && <ImportPanel onClose={() => setPanel(null)} />}
      {panel === 'password' && <PasswordPanel onClose={() => setPanel(null)} />}
    </div>
  )
}

function OfflineSection() {
  const { data, online } = useStore()
  const [status, setStatus] = useState<MapCacheStatus>({ cached: false, bytes: null })
  const [prog, setProg] = useState<{ loaded: number; total: number | null } | null>(null)
  const [photo, setPhoto] = useState<PhotoSyncProgress | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const refresh = () => { mapCacheStatus().then(setStatus) }
  useEffect(refresh, [])
  const photoUrls = Object.values(data.places).flatMap((p) => p.photos)

  const download = async () => {
    setErr(null); abort.current = new AbortController()
    setProg({ loaded: 0, total: null })
    try {
      await downloadMap((loaded, total) => setProg({ loaded, total }), abort.current.signal)
      const { resetTileSource } = await import('./MapView')
      resetTileSource()
      refresh()
    } catch (e) { if ((e as Error).name !== 'AbortError') setErr((e as Error).message) }
    finally { setProg(null) }
  }
  const sync = async () => {
    setErr(null); abort.current = new AbortController()
    setPhoto({ done: 0, total: photoUrls.length, failed: 0 })
    try { await syncPhotos(photoUrls, setPhoto, abort.current.signal) }
    catch (e) { setErr((e as Error).message) }
  }

  return (
    <>
      <div className="section"><h3>Offline</h3>{!online && <span className="tiny" style={{ color: 'var(--accent)', fontWeight: 700 }}>OFFLINE</span>}</div>
      <div className="pad stack">
        <div className="card stack" style={{ gap: 8 }}>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 600 }}>Tokyo map</div><div className="small muted">{status.cached ? `Saved on this phone${status.bytes ? ` · ${fmtBytes(status.bytes)}` : ''}` : isPmtiles() ? 'Not downloaded' : 'Tiles load online; viewed areas stay cached'}</div></div>
            {isPmtiles() && !prog && (status.cached
              ? <button className="btn line sm" onClick={async () => { await deleteMapCache(); const { resetTileSource } = await import('./MapView'); resetTileSource(); refresh() }}>Remove</button>
              : <button className="btn sm" onClick={download} disabled={!online}><Icon.Download />Download</button>)}
            {prog && <button className="btn line sm" onClick={() => abort.current?.abort()}>Cancel</button>}
          </div>
          {prog && (
            <>
              <div className="progress"><i style={{ width: prog.total ? `${(100 * prog.loaded) / prog.total}%` : '30%' }} /></div>
              <div className="tiny muted num">{fmtBytes(prog.loaded)}{prog.total ? ` of ${fmtBytes(prog.total)}` : ''}</div>
            </>
          )}
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 600 }}>Place photos</div><div className="small muted">{photoUrls.length} photos across {Object.keys(data.places).length} places</div></div>
            {(!photo || photo.done >= photo.total) && <button className="btn sm ghost" onClick={sync} disabled={!online || photoUrls.length === 0}>Save all</button>}
          </div>
          {photo && photo.done < photo.total && <div className="progress"><i style={{ width: `${(100 * photo.done) / photo.total}%` }} /></div>}
          {photo && photo.done >= photo.total && <div className="tiny muted">Done{photo.failed ? ` · ${photo.failed} failed` : ''}</div>}
        </div>
        <div className="small muted">Places, days and notes sync automatically and stay available offline once loaded. Add this page to your Home Screen for the full-screen app.</div>
        {err && <div className="err">{err}</div>}
      </div>
    </>
  )
}

function PeoplePanel({ onClose }: { onClose: () => void }) {
  const { users, me, createUser, updateUser, deleteUser } = useStore()
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [pw, setPw] = useState(''); const [role, setRole] = useState<Role>('viewer')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null)
  const list = Object.values(users).sort((a, b) => a.createdAt - b.createdAt)
  const add = async () => {
    setBusy(true); setErr(null); setOk(null)
    try {
      await createUser({ email, name: name.trim() || email.split('@')[0]!, password: pw, role })
      setOk(`Added ${name || email}. Send them the site link and this password.`)
      setEmail(''); setName(''); setPw('')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Sheet onClose={onClose} title="People">
      <div className="list">
        {list.map((u) => (
          <div key={u.id} className="row">
            <div className="body"><div className="title">{u.name}{u.id === me?.id ? ' (you)' : ''}</div><div className="sub">{u.email}</div></div>
            <Segmented<Role> value={u.role} onChange={(r) => { if (u.id !== me?.id) updateUser(u.id, { role: r }) }} options={[{ value: 'viewer', label: 'Viewer' }, { value: 'editor', label: 'Editor' }]} />
            {u.id !== me?.id && <button className="iconbtn plain" aria-label="Remove" onClick={() => { if (confirmDialog(`Remove ${u.name}? They will lose access.`)) deleteUser(u.id) }}><Icon.Close /></button>}
          </div>
        ))}
      </div>
      <div className="section"><h3>Add someone</h3></div>
      <div className="pad stack">
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><input className="input" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {hasFirebase && <Field label="Password (share it with them)"><input className="input" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" /></Field>}
        <div className="hstack" style={{ justifyContent: 'space-between' }}><span>Role</span><Segmented<Role> value={role} onChange={setRole} options={[{ value: 'viewer', label: 'Viewer' }, { value: 'editor', label: 'Editor' }]} /></div>
        {err && <div className="err">{err}</div>}
        {ok && <div className="small">{ok}</div>}
        <button className="btn block" onClick={add} disabled={busy || !email || (hasFirebase && pw.length < 6)}>{busy ? <Spinner /> : <><Icon.Plus />Add {role}</>}</button>
        <div className="small muted">Viewers can see everything and get directions; only editors can change places, days and people.</div>
      </div>
    </Sheet>
  )
}

function GroupsPanel({ onClose }: { onClose: () => void }) {
  const { sortedGroups, saveGroup, deleteGroup, data } = useStore()
  const [name, setName] = useState('')
  const add = async () => {
    if (!name.trim()) return
    const g: Group = { id: newId('g'), name: name.trim(), order: sortedGroups.length, createdAt: Date.now() }
    await saveGroup(g); setName('')
  }
  const count = (id: string) => Object.values(data.places).filter((p) => p.groupIds.includes(id)).length
  return (
    <Sheet onClose={onClose} title="Groups">
      <div className="pad small muted" style={{ paddingBottom: 12 }}>Groups are your own collections that cut across categories: “Must do”, “Near the hotel”, “If it rains”. A place can be in several. They show up as filters on the map.</div>
      <div className="list">
        {sortedGroups.map((g) => (
          <div key={g.id} className="row">
            <input className="input" style={{ height: 38 }} defaultValue={g.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== g.name) saveGroup({ ...g, name: v }) }} />
            <span className="small muted num" style={{ width: 40, textAlign: 'right' }}>{count(g.id)}</span>
            <button className="iconbtn plain" aria-label="Delete" onClick={() => { if (confirmDialog(`Delete group “${g.name}”? Places stay.`)) deleteGroup(g.id) }}><Icon.Close /></button>
          </div>
        ))}
      </div>
      <div className="pad hstack" style={{ paddingTop: 14 }}>
        <input className="input" placeholder="New group" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        <button className="btn" onClick={add} disabled={!name.trim()}><Icon.Plus /></button>
      </div>
    </Sheet>
  )
}

function TripPanel({ onClose }: { onClose: () => void }) {
  const { data, saveTrip } = useStore()
  const [t, setT] = useState<Trip>(data.trip)
  return (
    <Sheet onClose={onClose} title="Trip" foot={<button className="btn block" onClick={async () => { await saveTrip({ ...t, numDays: Math.max(1, Math.min(60, t.numDays)) }); onClose() }}>Save</button>}>
      <div className="pad stack" style={{ gap: 14 }}>
        <Field label="Name"><input className="input" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></Field>
        <Field label="First day"><input className="input" type="date" value={t.startDate} onChange={(e) => setT({ ...t, startDate: e.target.value })} /></Field>
        <Field label="Number of days"><input className="input num" type="number" min={1} max={60} value={t.numDays} onChange={(e) => setT({ ...t, numDays: Number(e.target.value) || 1 })} /></Field>
        <div className="small muted">Reducing the day count hides later days but keeps their contents.</div>
      </div>
    </Sheet>
  )
}

function PasswordPanel({ onClose }: { onClose: () => void }) {
  const { changePassword } = useStore()
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  return (
    <Sheet half onClose={onClose} title="Change password" foot={<button className="btn block" disabled={busy || next.length < 6} onClick={async () => { setBusy(true); setErr(null); try { await changePassword(next, cur); onClose() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) } }}>Update</button>}>
      <div className="pad stack" style={{ gap: 14, paddingBottom: 12 }}>
        <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New password"><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        {err && <div className="err">{err}</div>}
      </div>
    </Sheet>
  )
}

type Stage = 'pick' | 'review' | 'running' | 'done'

function ImportPanel({ onClose }: { onClose: () => void }) {
  const { data, savePlaces, saveGroup, sortedGroups, online } = useStore()
  const [stage, setStage] = useState<Stage>('pick')
  const [res, setRes] = useState<ImportResult | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [cat, setCat] = useState<CategoryId | ''>('')
  const [groupMode, setGroupMode] = useState<'none' | 'folders' | 'new'>('folders')
  const [newGroup, setNewGroup] = useState('')
  const [enrich, setEnrich] = useState(hasPlaces && online)
  const [prog, setProg] = useState({ done: 0, total: 0, failed: 0 })
  const [err, setErr] = useState<string | null>(null)
  const [help, setHelp] = useState(false)

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setErr(null)
    try {
      const r = await parseImportFile(f)
      setRes(r); setSelected(new Set(r.rows.map((_, i) => i))); setStage('review')
      if (!r.rows.some((x) => x.folder)) setGroupMode('none')
    } catch (e) { setErr((e as Error).message) }
  }

  const run = async () => {
    if (!res) return
    setStage('running')
    const rows = res.rows.filter((_, i) => selected.has(i))
    setProg({ done: 0, total: rows.length, failed: 0 })
    const existingNames = new Set(Object.values(data.places).map((p) => p.name.toLowerCase()))
    // Groups
    const groupIdByName = new Map(sortedGroups.map((g) => [g.name.toLowerCase(), g.id]))
    const ensureGroup = async (name: string) => {
      const k = name.toLowerCase()
      if (groupIdByName.has(k)) return groupIdByName.get(k)!
      const g: Group = { id: newId('g'), name, order: groupIdByName.size, createdAt: Date.now() }
      await saveGroup(g); groupIdByName.set(k, g.id); return g.id
    }
    let sharedGroup: string | null = null
    if (groupMode === 'new' && newGroup.trim()) sharedGroup = await ensureGroup(newGroup.trim())
    const out: Place[] = []
    let failed = 0
    for (const [i, r] of rows.entries()) {
      try {
        const p = await rowToPlace(r, enrich, cat || undefined, data.trip.center)
        if (existingNames.has(p.name.toLowerCase())) { /* duplicate by name: still import, but flag in notes */ p.notes = [p.notes, 'Possible duplicate'].filter(Boolean).join('\n') }
        if (groupMode === 'folders' && r.folder) p.groupIds = [await ensureGroup(r.folder)]
        if (sharedGroup) p.groupIds = [sharedGroup]
        out.push(p)
      } catch { failed++ }
      setProg({ done: i + 1, total: rows.length, failed })
    }
    await savePlaces(out)
    setStage('done')
  }

  return (
    <Sheet onClose={onClose} title="Import">
      {stage === 'pick' && (
        <div className="pad stack" style={{ gap: 14 }}>
          <p className="small muted">Bring in what you've already saved in Google Maps. Two routes:</p>
          <div className="card stack" style={{ gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Saved lists → Google Takeout</div>
            <div className="small muted">takeout.google.com → deselect all → tick <b>Maps (your places)</b> → export. Unzip and pick a <b>.csv</b> from the Saved folder (one per list) or <b>Saved Places.json</b> (your starred places).</div>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Custom maps → My Maps</div>
            <div className="small muted">google.com/mymaps → open the map → ⋮ → <b>Export to KML/KMZ</b> → entire map. Layers become groups here.</div>
          </div>
          <label className="btn block" style={{ cursor: 'pointer' }}>
            <Icon.Download />Choose file
            <input type="file" accept=".csv,.json,.geojson,.kml,.kmz,text/csv,application/json" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {err && <div className="err">{err}</div>}
          <button className="small muted" style={{ textAlign: 'left', textDecoration: 'underline' }} onClick={() => setHelp((v) => !v)}>Why not a share link?</button>
          {help && <p className="small muted">Google doesn't offer a public API for reading a shared list, and its short links can't be opened from inside a web app. Takeout and My Maps exports are the reliable path. For single places, just search by name from the Places tab or paste the place's Google Maps link there.</p>}
        </div>
      )}

      {stage === 'review' && res && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="pad stack" style={{ gap: 12 }}>
            <div className="small muted">{res.rows.length} place{res.rows.length === 1 ? '' : 's'} found{res.warnings.length ? ` · ${res.warnings.join(' ')}` : ''}. {res.rows.filter((r) => r.lat == null).length > 0 && !enrich ? 'Rows without coordinates need Google lookup to appear on the map.' : ''}</div>
            {hasPlaces && (
              <div className="hstack" style={{ justifyContent: 'space-between' }}>
                <div><div style={{ fontWeight: 600 }}>Look up on Google</div><div className="small muted">Photos, hours, addresses, categories</div></div>
                <Segmented value={enrich ? 'yes' : 'no'} onChange={(v) => setEnrich(v === 'yes')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
              </div>
            )}
            <Field label="Category for all (or leave to auto-detect)">
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | '')}>
                <option value="">Auto</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Group">
              <select className="input" value={groupMode} onChange={(e) => setGroupMode(e.target.value as typeof groupMode)}>
                <option value="none">No group</option>
                {res.rows.some((r) => r.folder) && <option value="folders">Use My Maps layers as groups</option>}
                <option value="new">Put everything in one group…</option>
              </select>
            </Field>
            {groupMode === 'new' && <input className="input" placeholder="Group name, e.g. From Google Maps" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />}
          </div>
          <div className="section"><h3>Places</h3><button className="small muted" onClick={() => setSelected(selected.size === res.rows.length ? new Set() : new Set(res.rows.map((_, i) => i)))}>{selected.size === res.rows.length ? 'None' : 'All'}</button></div>
          <div className="list">
            {res.rows.map((r, i) => (
              <button key={i} className="row" onClick={() => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })}>
                <span className={`mark${selected.has(i) ? '' : ' outline'}`}>{selected.has(i) ? '✓' : ''}</span>
                <div className="body"><div className="title">{r.name}</div><div className="sub">{[r.folder, r.address ?? (r.lat != null ? `${r.lat.toFixed(4)}, ${r.lng?.toFixed(4)}` : 'no coordinates'), r.note].filter(Boolean).join(' · ')}</div></div>
              </button>
            ))}
          </div>
          <div className="pad"><button className="btn block" onClick={run} disabled={selected.size === 0}>Import {selected.size}</button></div>
        </div>
      )}

      {stage === 'running' && (
        <div className="pad stack">
          <div className="hstack"><Spinner /><span>{enrich ? 'Looking places up on Google…' : 'Importing…'}</span></div>
          <div className="progress"><i style={{ width: `${prog.total ? (100 * prog.done) / prog.total : 0}%` }} /></div>
          <div className="small muted num">{prog.done} of {prog.total}{prog.failed ? ` · ${prog.failed} failed` : ''}</div>
        </div>
      )}
      {stage === 'done' && (
        <div className="empty">
          <h2>Imported {prog.done - prog.failed}</h2>
          <p>{prog.failed ? `${prog.failed} couldn't be matched; add those by hand.` : "They're in the Places tab and on the map."}</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
        </div>
      )}
    </Sheet>
  )
}

async function rowToPlace(r: ImportRow, enrich: boolean, cat: CategoryId | undefined, bias: { lat: number; lng: number }): Promise<Place> {
  const now = Date.now()
  const base: Place = {
    id: newId('p'), name: r.name, category: cat ?? r.category ?? 'other', groupIds: [], lat: r.lat ?? 0, lng: r.lng ?? 0,
    address: r.address, notes: r.note, mapsUrl: r.url, photos: [], createdAt: now, updatedAt: now,
  }
  if (!enrich) {
    if (r.lat == null) throw new Error('no coordinates')
    return base
  }
  const near = r.lat != null ? { lat: r.lat, lng: r.lng! } : bias
  const hits = await searchPlaces(r.name, near, r.lat != null ? 1500 : 40000)
  const hit = hits[0]
  if (!hit) { if (r.lat == null) throw new Error('not found'); return base }
  const p = await fetchPlaceDetails(hit.id, { id: base.id, name: base.name, notes: base.notes, category: cat })
  return { ...p, category: cat ?? p.category }
}

function exportJson(data: TripData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `tokyo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

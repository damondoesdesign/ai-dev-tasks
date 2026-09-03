import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CATEGORIES } from '../model/categories'
import {
  defaultTrip, emptyDay, type CategoryId, type Day, type DayItem, type Group, type Place, type Theme, type Trip, type TripData, type UserProfile,
} from '../model/types'
import { newId } from '../lib/ids'
import { onlineStatus } from '../lib/offline'
import type { AuthState, NewUser, Repo } from '../lib/repo'
import { getRepo } from '../lib/repoFactory'
import { applyTheme, readStoredTheme, watchSystemTheme } from '../lib/theme'

export interface Filters {
  categories: Set<CategoryId>
  groups: Set<string>
  /** null = all places; number = only places on that day. */
  day: number | null
  query: string
}

interface Store {
  ready: boolean
  repo: Repo | null
  auth: AuthState
  me: UserProfile | null
  /** Signed in but no profile document yet (viewer created outside the app). */
  orphan: boolean
  isEditor: boolean
  users: Record<string, UserProfile>
  data: TripData
  online: boolean
  theme: Theme
  filters: Filters
  setFilters: (f: Partial<Filters> | ((f: Filters) => Filters)) => void
  visiblePlaces: Place[]
  sortedGroups: Group[]
  days: Day[]
  // actions
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setTheme: (t: Theme) => Promise<void>
  updateMe: (patch: Partial<UserProfile>) => Promise<void>
  createUser: (u: NewUser) => Promise<void>
  updateUser: (id: string, patch: Partial<UserProfile>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  changePassword: (next: string, current: string) => Promise<void>
  saveTrip: (t: Trip) => Promise<void>
  savePlace: (p: Place) => Promise<void>
  savePlaces: (ps: Place[]) => Promise<void>
  deletePlace: (id: string) => Promise<void>
  saveGroup: (g: Group) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  saveDay: (d: Day) => Promise<void>
  addToDay: (dayIndex: number, placeId: string, item?: Partial<DayItem>) => Promise<void>
  removeFromDay: (dayIndex: number, itemId: string) => Promise<void>
  moveItem: (fromDay: number, itemId: string, toDay: number) => Promise<void>
  reorderDay: (dayIndex: number, itemIds: string[]) => Promise<void>
  updateItem: (dayIndex: number, itemId: string, patch: Partial<DayItem>) => Promise<void>
  replaceAll: (data: TripData) => Promise<void>
  /** Which days a place is scheduled on. */
  daysFor: (placeId: string) => number[]
}

const Ctx = createContext<Store | null>(null)

const ALL_CATS = new Set<CategoryId>(CATEGORIES.map((c) => c.id))

export function StoreProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null)
  const [auth, setAuth] = useState<AuthState>({ uid: undefined, email: null })
  const [users, setUsers] = useState<Record<string, UserProfile>>({})
  const [data, setData] = useState<TripData>({ trip: defaultTrip(), places: {}, groups: {}, days: {} })
  const [dataReady, setDataReady] = useState(false)
  const [online, setOnline] = useState(true)
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [filters, setFiltersState] = useState<Filters>({ categories: new Set(ALL_CATS), groups: new Set(), day: null, query: '' })
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => { getRepo().then(setRepo) }, [])
  useEffect(() => onlineStatus(setOnline), [])
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => watchSystemTheme(() => themeRef.current), [])

  useEffect(() => { if (!repo) return; return repo.onAuth(setAuth) }, [repo])

  useEffect(() => {
    if (!repo || !auth.uid) { setUsers({}); setData({ trip: defaultTrip(), places: {}, groups: {}, days: {} }); setDataReady(false); return }
    const u1 = repo.onUsers(setUsers)
    const u2 = repo.onTrip((d) => { setData(d); setDataReady(true) })
    return () => { u1(); u2() }
  }, [repo, auth.uid])

  const me = auth.uid ? (users[auth.uid] ?? null) : null
  const orphan = Boolean(auth.uid && !me && Object.keys(users).length >= 0 && dataReady)

  // Bootstrap own profile (owner) on first sign-in.
  useEffect(() => {
    if (!repo || !auth.uid || !auth.email || me) return
    repo.ensureOwnProfile(auth.uid, auth.email).catch(() => { /* not owner */ })
  }, [repo, auth.uid, auth.email, me])

  // Profile theme wins over the device default once loaded.
  useEffect(() => { if (me?.theme && me.theme !== themeRef.current) setThemeState(me.theme) }, [me?.theme])

  const isEditor = me?.role === 'editor'

  const setFilters = useCallback((f: Partial<Filters> | ((f: Filters) => Filters)) => {
    setFiltersState((cur) => (typeof f === 'function' ? f(cur) : { ...cur, ...f }))
  }, [])

  const days = useMemo<Day[]>(() => {
    const out: Day[] = []
    for (let i = 0; i < data.trip.numDays; i++) out.push(data.days[`d${i}`] ?? emptyDay(i))
    return out
  }, [data.days, data.trip.numDays])

  const sortedGroups = useMemo(() => Object.values(data.groups).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)), [data.groups])

  const visiblePlaces = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    let dayIds: Set<string> | null = null
    if (filters.day != null) dayIds = new Set(days[filters.day]?.items.map((i) => i.placeId) ?? [])
    return Object.values(data.places)
      .filter((p) => filters.categories.has(p.category))
      .filter((p) => filters.groups.size === 0 || p.groupIds.some((g) => filters.groups.has(g)))
      .filter((p) => !dayIds || dayIds.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.nameJa ?? '').includes(q) || (p.address ?? '').toLowerCase().includes(q) || (p.notes ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.places, filters, days])

  const need = () => { if (!repo) throw new Error('Not ready'); return repo }
  const editOnly = () => { if (!isEditor) throw new Error('View-only account'); return need() }

  const saveDay = useCallback(async (d: Day) => { await editOnly().saveDays([d]) }, [repo, isEditor]) // eslint-disable-line react-hooks/exhaustive-deps

  const store: Store = {
    ready: Boolean(repo),
    repo, auth, me, orphan, isEditor, users, data, online, theme, filters, setFilters, visiblePlaces, sortedGroups, days,
    signIn: (email, password) => need().signIn({ email, password }),
    signOut: () => need().signOut(),
    setTheme: async (t) => {
      setThemeState(t)
      if (repo && auth.uid && me) await repo.updateUser(auth.uid, { theme: t }).catch(() => { /* offline: applied locally */ })
    },
    updateMe: async (patch) => { if (auth.uid) await need().updateUser(auth.uid, patch) },
    createUser: (u) => editOnly().createUser(u),
    updateUser: (id, patch) => editOnly().updateUser(id, patch),
    deleteUser: (id) => editOnly().deleteUser(id),
    changePassword: (next, current) => need().changePassword(next, current),
    saveTrip: (t) => editOnly().saveTrip(t),
    savePlace: (p) => editOnly().savePlace(p),
    savePlaces: (ps) => editOnly().savePlaces(ps),
    deletePlace: async (id) => {
      const r = editOnly()
      const touched = days.filter((d) => d.items.some((i) => i.placeId === id)).map((d) => ({ ...d, items: d.items.filter((i) => i.placeId !== id) }))
      if (touched.length) await r.saveDays(touched)
      await r.deletePlace(id)
    },
    saveGroup: (g) => editOnly().saveGroup(g),
    deleteGroup: async (id) => {
      const r = editOnly()
      const touched = Object.values(data.places).filter((p) => p.groupIds.includes(id)).map((p) => ({ ...p, groupIds: p.groupIds.filter((g) => g !== id) }))
      if (touched.length) await r.savePlaces(touched)
      await r.deleteGroup(id)
    },
    saveDay,
    addToDay: async (i, placeId, item) => {
      const d = days[i]; if (!d) return
      await saveDay({ ...d, items: [...d.items, { id: newId('i'), placeId, ...item }] })
    },
    removeFromDay: async (i, itemId) => {
      const d = days[i]; if (!d) return
      await saveDay({ ...d, items: d.items.filter((x) => x.id !== itemId) })
    },
    moveItem: async (from, itemId, to) => {
      const a = days[from], b = days[to]; if (!a || !b || from === to) return
      const item = a.items.find((x) => x.id === itemId); if (!item) return
      await editOnly().saveDays([{ ...a, items: a.items.filter((x) => x.id !== itemId) }, { ...b, items: [...b.items, item] }])
    },
    reorderDay: async (i, ids) => {
      const d = days[i]; if (!d) return
      const byId = new Map(d.items.map((x) => [x.id, x]))
      const items = ids.map((id) => byId.get(id)).filter(Boolean) as DayItem[]
      await saveDay({ ...d, items })
    },
    updateItem: async (i, itemId, patch) => {
      const d = days[i]; if (!d) return
      await saveDay({ ...d, items: d.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) })
    },
    replaceAll: (d) => editOnly().replaceAll(d),
    daysFor: (placeId) => days.filter((d) => d.items.some((i) => i.placeId === placeId)).map((d) => d.index),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}

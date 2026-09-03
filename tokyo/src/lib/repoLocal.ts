import { defaultTrip, type Day, type Group, type Place, type Trip, type TripData, type UserProfile } from '../model/types'
import { newId } from './ids'
import type { AuthState, Credentials, NewUser, Repo } from './repo'

const DATA_KEY = 'tokyo.local.data'
const USERS_KEY = 'tokyo.local.users'
const AUTH_KEY = 'tokyo.local.auth'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* quota */ }
}

/**
 * Single-device repo backed by localStorage. Used when Firebase isn't
 * configured. Any email/password signs in; the first account is the editor.
 */
export class LocalRepo implements Repo {
  readonly kind = 'local' as const
  private data: TripData = load(DATA_KEY, { trip: defaultTrip(), places: {}, groups: {}, days: {} })
  private users: Record<string, UserProfile> = load(USERS_KEY, {})
  private auth: AuthState = load(AUTH_KEY, { uid: null, email: null })
  private authSubs = new Set<(s: AuthState) => void>()
  private userSubs = new Set<(u: Record<string, UserProfile>) => void>()
  private tripSubs = new Set<(d: TripData) => void>()

  private emitTrip() { save(DATA_KEY, this.data); const d = { ...this.data }; this.tripSubs.forEach((cb) => cb(d)) }
  private emitUsers() { save(USERS_KEY, this.users); const u = { ...this.users }; this.userSubs.forEach((cb) => cb(u)) }
  private emitAuth() { save(AUTH_KEY, this.auth); this.authSubs.forEach((cb) => cb(this.auth)) }

  onAuth(cb: (s: AuthState) => void) { this.authSubs.add(cb); cb(this.auth); return () => { this.authSubs.delete(cb) } }
  async signIn({ email }: Credentials) {
    const norm = email.trim().toLowerCase()
    const existing = Object.values(this.users).find((u) => u.email === norm)
    const uid = existing?.id ?? 'u_' + norm.replace(/[^a-z0-9]/g, '_')
    this.auth = { uid, email: norm }
    this.emitAuth()
  }
  async signOut() { this.auth = { uid: null, email: null }; this.emitAuth() }
  async changePassword() { /* no passwords in local mode */ }

  onUsers(cb: (u: Record<string, UserProfile>) => void) { this.userSubs.add(cb); cb(this.users); return () => { this.userSubs.delete(cb) } }
  async ensureOwnProfile(uid: string, email: string) {
    if (this.users[uid]) return
    const first = Object.keys(this.users).length === 0
    this.users[uid] = {
      id: uid, email, name: email.split('@')[0] ?? 'Me', role: first ? 'editor' : 'viewer', theme: 'system', createdAt: Date.now(),
    }
    this.emitUsers()
  }
  async createUser(u: NewUser) {
    const id = 'u_' + u.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
    this.users[id] = { id, email: u.email.trim().toLowerCase(), name: u.name, role: u.role, theme: 'system', createdAt: Date.now() }
    this.emitUsers()
  }
  async updateUser(id: string, patch: Partial<UserProfile>) {
    const cur = this.users[id]; if (!cur) return
    this.users[id] = { ...cur, ...patch }; this.emitUsers()
  }
  async deleteUser(id: string) { delete this.users[id]; this.emitUsers() }

  onTrip(cb: (d: TripData) => void) { this.tripSubs.add(cb); cb({ ...this.data }); return () => { this.tripSubs.delete(cb) } }
  async saveTrip(t: Trip) { this.data = { ...this.data, trip: t }; this.emitTrip() }
  async savePlace(p: Place) { this.data = { ...this.data, places: { ...this.data.places, [p.id]: p } }; this.emitTrip() }
  async savePlaces(ps: Place[]) {
    const places = { ...this.data.places }
    for (const p of ps) places[p.id] = p
    this.data = { ...this.data, places }; this.emitTrip()
  }
  async deletePlace(id: string) {
    const places = { ...this.data.places }; delete places[id]
    const days = Object.fromEntries(Object.entries(this.data.days).map(([k, d]) => [k, { ...d, items: d.items.filter((i) => i.placeId !== id) }]))
    this.data = { ...this.data, places, days }; this.emitTrip()
  }
  async saveGroup(g: Group) { this.data = { ...this.data, groups: { ...this.data.groups, [g.id]: g } }; this.emitTrip() }
  async deleteGroup(id: string) {
    const groups = { ...this.data.groups }; delete groups[id]
    const places = Object.fromEntries(Object.entries(this.data.places).map(([k, p]) => [k, { ...p, groupIds: p.groupIds.filter((g) => g !== id) }]))
    this.data = { ...this.data, groups, places }; this.emitTrip()
  }
  async saveDays(days: Day[]) {
    const next = { ...this.data.days }
    for (const d of days) next[d.id] = d
    this.data = { ...this.data, days: next }; this.emitTrip()
  }
  async replaceAll(data: TripData) { this.data = data; this.emitTrip() }
}

export function localSeedId() { return newId('p') }

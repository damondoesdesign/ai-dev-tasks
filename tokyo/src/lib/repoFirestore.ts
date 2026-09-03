import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword, EmailAuthProvider, getAuth, onAuthStateChanged,
  reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword,
  indexedDBLocalPersistence, initializeAuth, browserLocalPersistence, type Auth,
} from 'firebase/auth'
import {
  collection, deleteDoc, doc, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, setDoc, writeBatch, type Firestore, updateDoc,
} from 'firebase/firestore'
import { defaultTrip, type Day, type Group, type Place, type Trip, type TripData, type UserProfile } from '../model/types'
import { firebaseConfig, ownerEmail } from './config'
import type { AuthState, Credentials, NewUser, Repo } from './repo'

const TRIP = 'main'

function strip<T extends object>(o: T): T {
  // Firestore rejects undefined values.
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

export class FirestoreRepo implements Repo {
  readonly kind = 'firebase' as const
  private app: FirebaseApp
  private auth: Auth
  private db: Firestore

  constructor() {
    this.app = initializeApp(firebaseConfig)
    this.auth = initializeAuth(this.app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }

  onAuth(cb: (s: AuthState) => void) {
    cb({ uid: undefined, email: null })
    return onAuthStateChanged(this.auth, (u) => cb({ uid: u?.uid ?? null, email: u?.email ?? null }))
  }
  async signIn({ email, password }: Credentials) { await signInWithEmailAndPassword(this.auth, email.trim(), password) }
  async signOut() { await signOut(this.auth) }
  async changePassword(next: string, current: string) {
    const u = this.auth.currentUser
    if (!u?.email) throw new Error('Not signed in')
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current))
    await updatePassword(u, next)
  }

  onUsers(cb: (users: Record<string, UserProfile>) => void) {
    return onSnapshot(collection(this.db, 'users'), (snap) => {
      const out: Record<string, UserProfile> = {}
      snap.forEach((d) => { out[d.id] = { ...(d.data() as UserProfile), id: d.id } })
      cb(out)
    }, (err) => console.warn('users snapshot', err))
  }
  async ensureOwnProfile(uid: string, email: string) {
    const isOwner = ownerEmail && email.toLowerCase() === ownerEmail
    if (!isOwner) return // other profiles are created by an editor
    const ref = doc(this.db, 'users', uid)
    await setDoc(ref, strip({
      email: email.toLowerCase(), name: email.split('@')[0] ?? 'Editor', role: 'editor', theme: 'system', createdAt: Date.now(),
    }), { merge: true })
  }
  async createUser(u: NewUser) {
    // A throwaway app instance creates the auth account without signing the
    // editor out of this one.
    const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`)
    try {
      const sAuth = getAuth(secondary)
      const cred = await createUserWithEmailAndPassword(sAuth, u.email.trim(), u.password)
      await signOut(sAuth)
      await setDoc(doc(this.db, 'users', cred.user.uid), strip({
        email: u.email.trim().toLowerCase(), name: u.name, role: u.role, theme: 'system', createdAt: Date.now(),
      }))
    } finally {
      await deleteApp(secondary)
    }
  }
  async updateUser(id: string, patch: Partial<UserProfile>) {
    const { id: _id, ...rest } = patch
    await updateDoc(doc(this.db, 'users', id), strip(rest))
  }
  async deleteUser(id: string) {
    // Removing the profile locks the account out (rules require a profile).
    // The auth account itself can be deleted in the Firebase console.
    await deleteDoc(doc(this.db, 'users', id))
  }

  onTrip(cb: (data: TripData) => void) {
    const state: TripData = { trip: defaultTrip(), places: {}, groups: {}, days: {} }
    let ready = 0
    const emit = () => { if (ready >= 4) cb({ trip: state.trip, places: { ...state.places }, groups: { ...state.groups }, days: { ...state.days } }) }
    const mark = () => { ready = Math.min(ready + 1, 4) }
    const tripRef = doc(this.db, 'trips', TRIP)
    const u1 = onSnapshot(tripRef, (d) => { if (d.exists()) state.trip = { ...(d.data() as Trip), id: TRIP }; mark(); emit() })
    const sub = (name: 'places' | 'groups' | 'days') =>
      onSnapshot(collection(this.db, 'trips', TRIP, name), (snap) => {
        const out: Record<string, unknown> = {}
        snap.forEach((d) => { out[d.id] = { ...d.data(), id: d.id } })
        ;(state as unknown as Record<string, unknown>)[name] = out
        mark(); emit()
      })
    const u2 = sub('places'), u3 = sub('groups'), u4 = sub('days')
    return () => { u1(); u2(); u3(); u4() }
  }
  async saveTrip(t: Trip) { await setDoc(doc(this.db, 'trips', TRIP), strip(t)) }
  async savePlace(p: Place) { await setDoc(doc(this.db, 'trips', TRIP, 'places', p.id), strip(p)) }
  async savePlaces(ps: Place[]) {
    for (let i = 0; i < ps.length; i += 400) {
      const b = writeBatch(this.db)
      for (const p of ps.slice(i, i + 400)) b.set(doc(this.db, 'trips', TRIP, 'places', p.id), strip(p))
      await b.commit()
    }
  }
  async deletePlace(id: string) { await deleteDoc(doc(this.db, 'trips', TRIP, 'places', id)) }
  async saveGroup(g: Group) { await setDoc(doc(this.db, 'trips', TRIP, 'groups', g.id), strip(g)) }
  async deleteGroup(id: string) { await deleteDoc(doc(this.db, 'trips', TRIP, 'groups', id)) }
  async saveDays(days: Day[]) {
    const b = writeBatch(this.db)
    for (const d of days) b.set(doc(this.db, 'trips', TRIP, 'days', d.id), strip(d))
    await b.commit()
  }
  async replaceAll(data: TripData) {
    await this.saveTrip(data.trip)
    await this.savePlaces(Object.values(data.places))
    for (const g of Object.values(data.groups)) await this.saveGroup(g)
    await this.saveDays(Object.values(data.days))
  }
}

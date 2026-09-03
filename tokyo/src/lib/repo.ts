import type { Day, Group, Place, Trip, TripData, UserProfile } from '../model/types'

export interface Credentials { email: string; password: string }

export interface NewUser { email: string; password: string; name: string; role: UserProfile['role'] }

export interface AuthState {
  /** null = signed out, undefined = still resolving. */
  uid: string | null | undefined
  email: string | null
}

export interface Repo {
  readonly kind: 'local' | 'firebase'
  // --- auth ---
  onAuth(cb: (s: AuthState) => void): () => void
  signIn(c: Credentials): Promise<void>
  signOut(): Promise<void>
  changePassword(next: string, current: string): Promise<void>
  // --- users ---
  onUsers(cb: (users: Record<string, UserProfile>) => void): () => void
  /** Creates the signed-in user's own profile (first-run / owner bootstrap). */
  ensureOwnProfile(uid: string, email: string): Promise<void>
  createUser(u: NewUser): Promise<void>
  updateUser(id: string, patch: Partial<UserProfile>): Promise<void>
  deleteUser(id: string): Promise<void>
  // --- trip data ---
  onTrip(cb: (data: TripData) => void): () => void
  saveTrip(t: Trip): Promise<void>
  savePlace(p: Place): Promise<void>
  savePlaces(ps: Place[]): Promise<void>
  deletePlace(id: string): Promise<void>
  saveGroup(g: Group): Promise<void>
  deleteGroup(id: string): Promise<void>
  saveDays(days: Day[]): Promise<void>
  /** Replaces all trip content (import / restore). */
  replaceAll(data: TripData): Promise<void>
}

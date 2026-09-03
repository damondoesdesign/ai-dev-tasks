export type Role = 'editor' | 'viewer'
export type Theme = 'light' | 'dark' | 'system'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: Role
  theme: Theme
  createdAt: number
}

export type CategoryId =
  | 'food' | 'coffee' | 'bar' | 'shop' | 'park' | 'museum'
  | 'temple' | 'sight' | 'hotel' | 'station' | 'other'

export interface Place {
  id: string
  name: string
  nameJa?: string
  category: CategoryId
  groupIds: string[]
  lat: number
  lng: number
  address?: string
  /** Google's editorial summary or the editor's own blurb. */
  description?: string
  /** Private notes from the editor (tips, reservations, what to order). */
  notes?: string
  /** Weekday descriptions, e.g. "Monday: 11:00 AM – 10:00 PM". */
  hours?: string[]
  website?: string
  phone?: string
  mapsUrl?: string
  googlePlaceId?: string
  photos: string[]
  rating?: number
  ratingCount?: number
  priceLevel?: string
  primaryType?: string
  /** Set when the place must be booked / has a ticket. */
  booked?: boolean
  createdAt: number
  updatedAt: number
}

export interface Group {
  id: string
  name: string
  order: number
  createdAt: number
}

export interface DayItem {
  id: string
  placeId: string
  /** "HH:MM" local, optional. */
  time?: string
  note?: string
}

export interface Day {
  /** "d0" .. "d13" */
  id: string
  index: number
  title?: string
  note?: string
  items: DayItem[]
}

export interface Trip {
  id: string
  name: string
  /** ISO date "YYYY-MM-DD" of day 1. */
  startDate: string
  numDays: number
  center: { lat: number; lng: number }
  createdAt: number
}

export interface TripData {
  trip: Trip
  places: Record<string, Place>
  groups: Record<string, Group>
  days: Record<string, Day>
}

export const TOKYO_CENTER = { lat: 35.6762, lng: 139.6503 }

export function defaultTrip(): Trip {
  return {
    id: 'main',
    name: 'Tokyo',
    startDate: '2026-11-21',
    numDays: 14,
    center: TOKYO_CENTER,
    createdAt: Date.now(),
  }
}

export function dayId(index: number): string {
  return `d${index}`
}

export function emptyDay(index: number): Day {
  return { id: dayId(index), index, items: [] }
}

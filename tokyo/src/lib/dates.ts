export function addDays(iso: string, n: number): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, (d ?? 1) + n)
}

export function fmtDayDate(iso: string, index: number): { weekday: string; date: string; month: string } {
  const d = addDays(iso, index)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: String(d.getDate()),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  }
}

export function fmtLongDate(iso: string, index: number): string {
  return addDays(iso, index).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** Index of today's trip day, or null if outside the trip. */
export function todayIndex(startIso: string, numDays: number, now = new Date()): number | null {
  const start = addDays(startIso, 0)
  const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - start.getTime()
  const i = Math.floor(ms / 86400000)
  return i >= 0 && i < numDays ? i : null
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Pull today's line out of Google's weekday descriptions. */
export function hoursToday(hours: string[] | undefined, now = new Date()): string | null {
  if (!hours?.length) return null
  const name = WEEKDAYS[now.getDay()]
  const line = hours.find((h) => h.startsWith(name))
  if (!line) return null
  return line.slice(name.length + 1).trim()
}

export function fmtTime(t?: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const suffix = h >= 12 ? 'pm' : 'am'
  const hh = h % 12 === 0 ? 12 : h % 12
  return m ? `${hh}:${String(m).padStart(2, '0')}${suffix}` : `${hh}${suffix}`
}

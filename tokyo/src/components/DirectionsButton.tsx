import { useState } from 'react'
import { googleDirectionsUrl, openExternal, planDirections } from '../lib/directions'
import { formatDistance, walkMinutes } from '../lib/geo'
import type { Place } from '../model/types'
import { Icon } from './ui'

/** One tap: walking if you're close, trains if you're not. */
export default function DirectionsButton({ place, block }: { place: Place; block?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const go = async () => {
    setBusy(true)
    try {
      const plan = await planDirections(place)
      if (plan.distanceM != null) {
        setHint(plan.mode === 'walking' ? `Walk ${walkMinutes(plan.distanceM)} min` : `Train · ${formatDistance(plan.distanceM)} away`)
      }
      openExternal(googleDirectionsUrl(place, plan.mode))
    } finally { setBusy(false) }
  }
  return (
    <button className={`btn accent${block ? ' block' : ''}`} onClick={go} disabled={busy}>
      <Icon.Go />{hint ?? 'Directions'}
    </button>
  )
}

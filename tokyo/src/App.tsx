import { useEffect } from 'react'
import DaysScreen from './components/DaysScreen'
import Login from './components/Login'
import MapScreen from './components/MapScreen'
import PlaceDetail from './components/PlaceDetail'
import PlaceEditor from './components/PlaceEditor'
import PlacesScreen from './components/PlacesScreen'
import SettingsScreen from './components/SettingsScreen'
import TabBar from './components/TabBar'
import { Spinner } from './components/ui'
import { useRoute } from './state/router'
import { useStore } from './state/store'

export default function App() {
  const { ready, auth, me, orphan, signOut, online } = useStore()
  const route = useRoute()

  useEffect(() => { if (!location.hash) history.replaceState(null, '', '#/map') }, [])

  if (!ready || auth.uid === undefined) return <div className="center"><Spinner /></div>
  if (!auth.uid) return <Login />
  if (!me) {
    return (
      <div className="login">
        {orphan ? (
          <>
            <h1>No profile yet</h1>
            <p className="muted">You're signed in as {auth.email}, but an editor hasn't added you to the trip. Ask them to add this email under Settings → People.</p>
            <button className="btn line" onClick={signOut}>Sign out</button>
          </>
        ) : <div className="center"><Spinner /></div>}
      </div>
    )
  }

  const first = route.parts[0]
  const from = route.params.get('from') ?? route.tab
  const overlay =
    first === 'place' && route.parts[1] ? <PlaceOverlay id={route.parts[1]} from={from} /> :
    first === 'add' ? <PlaceEditor from="places" /> :
    first === 'edit' && route.parts[1] ? <EditOverlay id={route.parts[1]} from={from} /> : null

  return (
    <div className="app">
      {!online && <div className="banner" style={{ position: 'absolute', top: 'var(--sat)', left: 0, right: 0, zIndex: 50, justifyContent: 'center', padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Offline</div>}
      {route.tab === 'map' && <MapScreen />}
      {route.tab === 'places' && <PlacesScreen />}
      {route.tab === 'days' && <DaysScreen />}
      {route.tab === 'settings' && <SettingsScreen />}
      <TabBar active={route.tab} />
      {overlay}
    </div>
  )
}

function PlaceOverlay({ id, from }: { id: string; from: string }) {
  const { data } = useStore()
  const p = data.places[id]
  if (!p) return null
  return <PlaceDetail place={p} from={from} />
}

function EditOverlay({ id, from }: { id: string; from: string }) {
  const { data, isEditor } = useStore()
  const p = data.places[id]
  if (!p || !isEditor) return null
  return <PlaceEditor existing={p} from={from} />
}

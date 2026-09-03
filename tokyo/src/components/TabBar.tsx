import { navigate, type Tab } from '../state/router'
import { Icon } from './ui'

const TABS: { id: Tab; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'map', label: 'Map', icon: Icon.Map },
  { id: 'places', label: 'Places', icon: Icon.List },
  { id: 'days', label: 'Days', icon: Icon.Days },
  { id: 'settings', label: 'Settings', icon: Icon.Gear },
]

export default function TabBar({ active }: { active: Tab }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => navigate(t.id)} aria-current={active === t.id ? 'page' : undefined}>
          <t.icon />{t.label}
        </button>
      ))}
    </nav>
  )
}

import type { Theme } from '../model/types'

const KEY = 'tokyo.theme'

export function readStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch { /* private mode */ }
  return 'system'
}

export function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'system') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return t
}

export function applyTheme(t: Theme) {
  try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  const resolved = resolveTheme(t)
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null
  const color = resolved === 'dark' ? '#0e0e0e' : '#ffffff'
  if (meta) meta.content = color
  else {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    m.content = color
    document.head.appendChild(m)
  }
}

/** Re-applies when the OS theme flips while in "system". */
export function watchSystemTheme(get: () => Theme): () => void {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const h = () => { if (get() === 'system') applyTheme('system') }
  mq.addEventListener('change', h)
  return () => mq.removeEventListener('change', h)
}

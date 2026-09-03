import { useState } from 'react'
import { hasFirebase } from '../lib/config'
import { useStore } from '../state/store'
import { Field, Icon, Spinner } from './ui'

export default function Login() {
  const { signIn } = useStore()
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('tokyo.email') ?? '' } catch { return '' } })
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await signIn(email, pw)
      try { localStorage.setItem('tokyo.email', email.trim()) } catch { /* ignore */ }
    } catch (ex) {
      const code = (ex as { code?: string }).code ?? ''
      setErr(/invalid-credential|wrong-password|user-not-found/.test(code) ? 'Wrong email or password.' : /network/.test(code) ? 'No connection. Sign in once online; after that the app works offline.' : (ex as Error).message)
    } finally { setBusy(false) }
  }
  return (
    <form className="login" onSubmit={submit}>
      <div className="logo"><i /></div>
      <div>
        <h1>Tokyo</h1>
        <p className="muted" style={{ marginTop: 6 }}>{hasFirebase ? 'Sign in to see the trip.' : 'Local mode: enter any email to continue. Data stays on this device.'}</p>
      </div>
      <Field label="Email"><input className="input" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
      {hasFirebase && <Field label="Password"><input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>}
      {err && <div className="err">{err}</div>}
      <button className="btn block" type="submit" disabled={busy}>{busy ? <Spinner /> : <><Icon.Check />Sign in</>}</button>
    </form>
  )
}

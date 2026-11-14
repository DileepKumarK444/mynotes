import { useState, type FormEvent } from 'react'
import { hasSupabase, supabase } from './lib/supabase'

type Mode = 'in' | 'up' | 'reset'

export function Auth({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setInfo('')
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'up') {
        if (password.length < 8) throw new Error('Use a password of at least 8 characters.')
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setInfo('Check your inbox to confirm your email, then sign in.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setInfo('If that address has an account, a reset link is on its way.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'in' ? 'Welcome back' : mode === 'up' ? 'Create your account' : 'Reset your password'

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h4"/></svg>
          </div>
          <span className="brand-name">MyNotes</span>
        </div>
        <h1>{title}</h1>
        <p className="auth-sub">{mode === 'reset' ? 'We will email you a link to choose a new password.' : 'Your notebooks, synced and private to you.'}</p>

        {hasSupabase ? (
          <form onSubmit={submit} className="auth-form">
            <label>Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            {mode !== 'reset' && (
              <label>Password
                <input type="password" required minLength={mode === 'up' ? 8 : 1} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'up' ? 'At least 8 characters' : 'Your password'} />
              </label>
            )}
            {error && <div className="auth-msg err" role="alert">{error}</div>}
            {info && <div className="auth-msg ok" role="status">{info}</div>}
            <button className="primary wide" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
            </button>
            <div className="auth-links">
              {mode === 'in' && <><button type="button" onClick={() => { setMode('up'); setError(''); setInfo('') }}>Create an account</button><button type="button" onClick={() => { setMode('reset'); setError(''); setInfo('') }}>Forgot password?</button></>}
              {mode !== 'in' && <button type="button" onClick={() => { setMode('in'); setError(''); setInfo('') }}>Back to sign in</button>}
            </div>
          </form>
        ) : (
          <div className="auth-msg warn">
            Cloud sync is not configured for this build. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> (see README), or try the local demo.
          </div>
        )}

        <div className="auth-or"><span>or</span></div>
        <button className="demo-btn" onClick={onDemo}>Continue in local demo mode</button>
        <p className="auth-fine">Demo mode keeps notes only in this browser.</p>
      </div>
    </main>
  )
}

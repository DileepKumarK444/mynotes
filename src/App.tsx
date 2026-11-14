import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Auth } from './Auth'
import { NotebookSidebar } from './components/NotebookSidebar'
import { SettingsDialog } from './components/SettingsDialog'
import { Workspace } from './components/Workspace'
import { loadAll, searchPages, uploadImage as uploadCloudImage, type Data } from './lib/backend'
import { hasSupabase, supabase } from './lib/supabase'
import { useSync } from './lib/useSync'
import { loadDemo, starterState, useNotes, withSavedSelection } from './store'
import type { State } from './types'

const MODE_KEY = 'mynotes-mode'
const readDemoFlag = () => { try { return localStorage.getItem(MODE_KEY) === 'demo' } catch { return false } }

function useIsMobile() {
  const q = '(max-width: 860px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

/** Loads the user's data, then hands it to the notes workspace. */
function CloudGate({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [boot, setBoot] = useState<{ initial: State; baseline: Data } | { error: string } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadAll()
      .then((d) => {
        if (cancelled) return
        const theme = loadDemo().theme
        if (!d.notebooks.length) {
          // First sign-in: create a starter notebook; baseline is empty so it is pushed.
          setBoot({ initial: starterState(), baseline: { notebooks: [], sections: [], pages: [] } })
        } else {
          const base: State = { ...d, notebookId: '', sectionId: '', pageId: '', theme }
          setBoot({ initial: withSavedSelection(base, session.user.id), baseline: d })
        }
      })
      .catch((e: unknown) => { if (!cancelled) setBoot({ error: e instanceof Error ? e.message : 'Could not load your notes' }) })
    return () => { cancelled = true }
  }, [session.user.id, attempt])

  if (!boot) return <div className="boot" role="status">Loading your notes…</div>
  if ('error' in boot) {
    return (
      <div className="boot">
        <p>We couldn’t load your notes: {boot.error}</p>
        <button className="primary" onClick={() => { setBoot(null); setAttempt((a) => a + 1) }}>Try again</button>
        <button className="demo-btn" onClick={onSignOut}>Sign out</button>
      </div>
    )
  }
  return <Notes initial={boot.initial} baseline={boot.baseline} mode="cloud" session={session} onSignOut={onSignOut} />
}

interface NotesProps {
  initial: State
  baseline: Data
  mode: 'demo' | 'cloud'
  session?: Session
  onSignOut: () => void
  onSignIn?: () => void
}

function Notes({ initial, baseline, mode, session, onSignOut, onSignIn }: NotesProps) {
  const [state, dispatch] = useNotes(initial, mode, session?.user.id)
  const sync = useSync(state, baseline, mode === 'cloud')
  const mobile = useIsMobile()
  const [hidden, setHidden] = useState(false)
  const [drawerRaw, setDrawer] = useState(false)
  const [settings, setSettings] = useState(false)
  const drawer = mobile && drawerRaw
  const page = state.pages.find((p) => p.id === state.pageId)

  useEffect(() => { document.documentElement.dataset.theme = state.theme }, [state.theme])

  const userId = session?.user.id
  const uploadImage = useCallback(async (file: File) => {
    if (mode === 'cloud' && userId) return uploadCloudImage(userId, file)
    if (!file.type.startsWith('image/')) throw new Error('Only image files can be inserted')
    if (file.size > 1_500_000) throw new Error('Demo mode keeps images in the browser: please use an image under 1.5 MB')
    return new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('Could not read the image'))
      r.readAsDataURL(file)
    })
  }, [mode, userId])

  const email = session?.user.email ?? undefined
  const account = useMemo(() => mode === 'cloud'
    ? { label: (session?.user.user_metadata?.display_name as string | undefined) ?? email?.split('@')[0] ?? 'Account', sub: email ?? '', initials: (email ?? '?').slice(0, 2).toUpperCase() }
    : { label: 'Demo mode', sub: 'Stored in this browser', initials: 'DM' }, [mode, email, session])

  return (
    <div className={`app ${hidden ? 'c1' : ''} ${drawer ? 'drawer-open' : ''}`}>
      <NotebookSidebar
        state={state}
        dispatch={dispatch}
        onCollapse={() => (mobile ? setDrawer(false) : setHidden(true))}
        onPick={() => mobile && setDrawer(false)}
        account={account}
        onSettings={() => setSettings(true)}
        searchRemote={mode === 'cloud' ? searchPages : undefined}
      />
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <Workspace
        state={state}
        dispatch={dispatch}
        page={page}
        sidebarHidden={hidden}
        onExpand={() => (mobile ? setDrawer(true) : setHidden(false))}
        mode={mode}
        sync={{ status: sync.status, error: sync.lastError, retry: () => void sync.retry() }}
        uploadImage={uploadImage}
      />
      {settings && (
        <SettingsDialog
          state={state}
          mode={mode}
          email={email}
          onClose={() => setSettings(false)}
          onTheme={(theme) => dispatch({ t: 'theme', theme })}
          onSignOut={onSignOut}
          onSignIn={() => onSignIn?.()}
          onReset={() => dispatch({ t: 'reset' })}
        />
      )}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!hasSupabase)
  const [demo, setDemo] = useState(readDemoFlag)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const setMode = (d: boolean) => {
    setDemo(d)
    try {
      if (d) localStorage.setItem(MODE_KEY, 'demo')
      else localStorage.removeItem(MODE_KEY)
    } catch { /* ignore */ }
  }
  const signOut = async () => { await supabase?.auth.signOut(); setMode(false) }
  const demoInitial = useMemo(() => loadDemo(), [])

  useEffect(() => { document.documentElement.dataset.theme = demoInitial.theme }, [demoInitial.theme])

  if (!ready) return <div className="boot" role="status">Loading…</div>
  if (session) return <CloudGate key={session.user.id} session={session} onSignOut={signOut} />
  if (demo) return <Notes initial={demoInitial} baseline={{ notebooks: [], sections: [], pages: [] }} mode="demo" onSignOut={signOut} onSignIn={() => setMode(false)} />
  return <Auth onDemo={() => setMode(true)} />
}

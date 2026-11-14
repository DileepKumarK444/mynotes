import { BookOpen, CloudCheck, CloudOff, Loader, Menu as MenuIcon, Star, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SyncStatus } from '../lib/useSync'
import type { Action } from '../store'
import { uid } from '../store'
import type { Page, State } from '../types'
import { PageEditor } from './PageEditor'

interface Props {
  state: State
  dispatch: (a: Action) => void
  page?: Page
  sidebarHidden: boolean
  onExpand: () => void
  mode: 'demo' | 'cloud'
  sync: { status: SyncStatus; error: string; retry: () => void }
  uploadImage: (file: File) => Promise<string>
}

export function Workspace({ state, dispatch, page, sidebarHidden, onExpand, mode, sync, uploadImage }: Props) {
  const [typing, setTyping] = useState(false)
  const [notice, setNotice] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<{ id: string; html: string } | null>(null)

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    if (pending.current) {
      dispatch({ t: 'setHtml', id: pending.current.id, html: pending.current.html })
      pending.current = null
    }
    setTyping(false)
  }, [dispatch])

  // Flush when switching page / unmounting so edits are never lost.
  useEffect(() => () => {
    if (pending.current) { dispatch({ t: 'setHtml', id: pending.current.id, html: pending.current.html }); pending.current = null }
  }, [page?.id, dispatch])

  const change = (html: string) => {
    if (!page) return
    pending.current = { id: page.id, html }
    setTyping(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 600)
  }

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(''), 6000)
    return () => window.clearTimeout(t)
  }, [notice])

  const nb = state.notebooks.find((n) => n.id === state.notebookId)
  const sec = state.sections.find((s) => s.id === state.sectionId)

  const menuBtn = (
    <button className={`icon-btn ${sidebarHidden ? '' : 'mobile-only'}`} onClick={onExpand} aria-label="Open notebooks" title="Open notebooks">
      <MenuIcon size={19} />
    </button>
  )

  if (!page) {
    return (
      <main className="col3 empty-ws">
        <div className="ws-top">{menuBtn}</div>
        <div className="empty big">
          <BookOpen size={44} />
          <h3>Select or create a page</h3>
          <p>Choose a page from “{sec?.name ?? 'a section'}” or start a new one.</p>
          {sec && <button className="primary" onClick={() => dispatch({ t: 'addPage', id: uid() })}>New page</button>}
        </div>
      </main>
    )
  }

  const busy = typing || sync.status === 'pending' || sync.status === 'saving'
  const saveLabel = sync.status === 'error'
    ? <button className="save-err" onClick={sync.retry} title={sync.error}><CloudOff size={14} /> Not saved · Retry</button>
    : busy ? <><Loader size={14} className="spin" /> Saving…</>
    : <><CloudCheck size={15} /> {mode === 'cloud' ? 'Saved to cloud' : 'Saved on this computer'}</>

  return (
    <main className="col3">
      <div className="ws-top">
        {menuBtn}
        <div className="crumbs">
          <span style={{ color: nb?.color }}>{nb?.name}</span>
          <span className="chev">›</span>
          <span className="sec-chip" style={{ ['--sc' as string]: sec?.color }}><i />{sec?.name}</span>
        </div>
        <div className="grow" />
        <div className={`save ${sync.status === 'error' ? 'err' : busy ? 'saving' : 'saved'}`} role="status" aria-live="polite"
          title={mode === 'cloud' ? 'Changes sync automatically to your account' : 'Notes are saved to a file on this computer (data/notes.json)'}>
          {saveLabel}
        </div>
        <button className={`icon-btn ${page.fav ? 'fav-on' : ''}`} aria-pressed={page.fav} aria-label={page.fav ? 'Remove from favourites' : 'Add to favourites'}
          onClick={() => dispatch({ t: 'toggleFav', id: page.id })}>
          <Star size={18} fill={page.fav ? 'currentColor' : 'none'} />
        </button>
      </div>
      {notice && (
        <div className="notice" role="alert">
          <span>{notice}</span>
          <button className="icon-btn sm" aria-label="Dismiss" onClick={() => setNotice('')}><X size={14} /></button>
        </div>
      )}
      <PageEditor
        key={page.id}
        page={page}
        onHtml={change}
        onTitle={(title) => dispatch({ t: 'renamePage', id: page.id, title })}
        uploadImage={uploadImage}
        onError={setNotice}
      />
    </main>
  )
}

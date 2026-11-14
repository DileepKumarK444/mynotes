import { Book, Briefcase, ChevronRight, FilePlus2, FileText, FolderPlus, GraduationCap, Home, Lightbulb, Moon, Pencil, PanelLeftClose, Plane, Plus, Search, Settings, Star, Sun, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SearchHit } from '../lib/backend'
import type { Action } from '../store'
import { textOf, uid } from '../store'
import type { IconKey, Page, State } from '../types'
import { InlineEdit } from './InlineEdit'
import { RowMenu } from './Menu'

const ICON: Record<IconKey, typeof Book> = {
  briefcase: Briefcase, home: Home, graduation: GraduationCap, plane: Plane, book: Book, lightbulb: Lightbulb,
}

interface Props {
  state: State
  dispatch: (a: Action) => void
  onCollapse: () => void
  onPick?: () => void
  account: { label: string; sub: string; initials: string }
  onSettings: () => void
  /** Server-side full-text search (cloud mode). Omitted in demo mode. */
  searchRemote?: (q: string) => Promise<SearchHit[]>
}

/** Renders a ts_headline snippet where matches are wrapped in << >>. */
function Snippet({ text }: { text: string }) {
  const parts: ReactNode[] = []
  text.split(/(<<.*?>>)/g).forEach((p, i) => parts.push(p.startsWith('<<') ? <mark key={i}>{p.slice(2, -2)}</mark> : p))
  return <>{parts}</>
}

export function NotebookSidebar({ state, dispatch, onCollapse, onPick, account, onSettings, searchRemote }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const dark = state.theme === 'dark'
  const isOpen = (id: string, active: boolean) => open[id] ?? active
  const setO = (id: string, v: boolean) => setOpen((o) => ({ ...o, [id]: v }))

  const [remote, setRemote] = useState<{ q: string; hits: SearchHit[] } | null>(null)
  useEffect(() => {
    const term = q.trim()
    if (!searchRemote || !term) return
    let cancelled = false
    const t = setTimeout(() => {
      searchRemote(term).then((hits) => { if (!cancelled) setRemote({ q: term, hits }) }).catch(() => { if (!cancelled) setRemote(null) })
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q, searchRemote])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    if (remote && remote.q.toLowerCase() === term) {
      return remote.hits.flatMap((h) => {
        const p = state.pages.find((x) => x.id === h.id)
        if (!p) return []
        const sec = state.sections.find((x) => x.id === p.sectionId)
        const book = state.notebooks.find((n) => n.id === sec?.notebookId)
        return [{ p, snip: h.snippet, sec, book }]
      })
    }
    return state.pages
      .map((p) => ({ p, body: textOf(p.html) }))
      .filter(({ p, body }) => p.title.toLowerCase().includes(term) || body.toLowerCase().includes(term))
      .map(({ p, body }) => {
        const i = body.toLowerCase().indexOf(term)
        const snip = i < 0 ? body.slice(0, 70) : (i > 24 ? '…' : '') + body.slice(Math.max(0, i - 24), i + 60)
        const sec = state.sections.find((s) => s.id === p.sectionId)
        const book = state.notebooks.find((n) => n.id === sec?.notebookId)
        return { p, snip, sec, book }
      })
  }, [q, remote, state.pages, state.sections, state.notebooks])

  const addNotebook = () => {
    const id = uid()
    dispatch({ t: 'addNotebook', id })
    setO(id, true)
    setEditing(id)
  }
  const addSection = (nbId: string) => {
    const id = uid()
    dispatch({ t: 'selectNotebook', id: nbId })
    dispatch({ t: 'addSection', id })
    setO(nbId, true)
    setEditing(id)
  }
  const addPage = (secId: string, nbId: string) => {
    const id = uid()
    dispatch({ t: 'selectNotebook', id: nbId })
    dispatch({ t: 'selectSection', id: secId })
    dispatch({ t: 'addPage', id })
    setO(secId, true)
    setEditing(id)
  }

  const favs = state.pages.filter((p) => p.fav)

  const pageRow = (p: Page, depth: 2 | 0 = 2) => {
    const active = p.id === state.pageId
    return (
      <li key={p.id} className={`tn page d${depth} ${active ? 'active' : ''}`}>
        <button className="tn-main" aria-current={active}
          onClick={() => { dispatch({ t: 'openPage', id: p.id }); onPick?.() }}>
          <FileText size={15} className="tn-ico" />
          {editing === p.id ? (
            <InlineEdit value={p.title} onCancel={() => setEditing(null)}
              onCommit={(v) => { dispatch({ t: 'renamePage', id: p.id, title: v.trim() || p.title }); setEditing(null) }} />
          ) : (<span className="tn-name">{p.title}</span>)}
        </button>
        {editing !== p.id && (
          <>
            <button className={`icon-btn sm star ${p.fav ? 'on' : ''}`} aria-pressed={p.fav}
              aria-label={p.fav ? 'Remove from favourites' : 'Add to favourites'}
              onClick={() => dispatch({ t: 'toggleFav', id: p.id })}>
              <Star size={14} fill={p.fav ? 'currentColor' : 'none'} />
            </button>
            <RowMenu label={`Page options for ${p.title}`} items={[
              { label: 'Rename', icon: <Pencil size={14} />, onClick: () => setEditing(p.id) },
              { label: 'Delete page', icon: <Trash2 size={14} />, danger: true, onClick: () => dispatch({ t: 'deletePage', id: p.id }) },
            ]} />
          </>
        )}
      </li>
    )
  }

  return (
    <aside className="col1 tree" aria-label="Notebooks">
      <div className="brand">
        <div className="logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h4"/></svg>
        </div>
        <span className="brand-name">MyNotes</span>
        <button className="icon-btn collapse-btn" onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse"><PanelLeftClose size={18} /></button>
      </div>

      <div className="search">
        <Search size={15} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all notebooks" aria-label="Search notes" />
        {q && <button className="icon-btn sm" aria-label="Clear search" onClick={() => setQ('')}><X size={14} /></button>}
      </div>

      {q.trim() ? (
        <div className="tree-scroll">
          <div className="eyebrow">{results.length} result{results.length === 1 ? '' : 's'}</div>
          <ul className="tl">
            {results.map(({ p, snip, sec, book }) => (
              <li key={p.id} className="tn result">
                <button className="tn-main col" onClick={() => { dispatch({ t: 'openPage', id: p.id }); onPick?.() }}>
                  <span className="tn-name">{p.title}</span>
                  <span className="crumb"><i style={{ background: sec?.color }} />{book?.name} › {sec?.name}</span>
                  <span className="snip"><Snippet text={snip} /></span>
                </button>
              </li>
            ))}
          </ul>
          {!results.length && <p className="empty">No notes match “{q}”.</p>}
        </div>
      ) : (
        <div className="tree-scroll">
          {favs.length > 0 && (
            <>
              <div className="eyebrow"><Star size={11} fill="currentColor" /> Favourites</div>
              <ul className="tl">{favs.map((p) => pageRow(p, 0))}</ul>
            </>
          )}
          <div className="eyebrow">Notebooks</div>
          <ul className="tl" role="tree">
            {state.notebooks.map((nb) => {
              const Icon = ICON[nb.icon]
              const activeNb = nb.id === state.notebookId
              const nbOpen = isOpen(nb.id, activeNb)
              const secs = state.sections.filter((s) => s.notebookId === nb.id)
              return (
                <li key={nb.id} role="treeitem" aria-expanded={nbOpen}>
                  <div className={`tn nb ${activeNb ? 'active' : ''}`} style={{ ['--nb' as string]: nb.color }}>
                    <button className="chev-btn" aria-label={nbOpen ? 'Collapse notebook' : 'Expand notebook'} onClick={() => setO(nb.id, !nbOpen)}>
                      <ChevronRight size={14} className={nbOpen ? 'rot' : ''} />
                    </button>
                    <button className="tn-main" title={nb.name}
                      onClick={() => {
                        if (!activeNb) { dispatch({ t: 'selectNotebook', id: nb.id }); setO(nb.id, true) } else setO(nb.id, !nbOpen)
                      }}>
                      <span className="nb-icon"><Icon size={16} /></span>
                      {editing === nb.id ? (
                        <InlineEdit value={nb.name} onCancel={() => setEditing(null)}
                          onCommit={(v) => { dispatch({ t: 'renameNotebook', id: nb.id, name: v }); setEditing(null) }} />
                      ) : (<span className="tn-name">{nb.name}</span>)}
                    </button>
                    {editing !== nb.id && (
                      <>
                        <button className="icon-btn sm add" aria-label={`New section in ${nb.name}`} title="New section" onClick={() => addSection(nb.id)}><FolderPlus size={15} /></button>
                        <RowMenu label={`Notebook options for ${nb.name}`} items={[
                          { label: 'New section', icon: <FolderPlus size={14} />, onClick: () => addSection(nb.id) },
                          { label: 'Rename', icon: <Pencil size={14} />, onClick: () => setEditing(nb.id) },
                          { label: 'Delete notebook', icon: <Trash2 size={14} />, danger: true, disabled: state.notebooks.length <= 1,
                            onClick: () => { if (confirm(`Delete notebook "${nb.name}" and all its pages?`)) dispatch({ t: 'deleteNotebook', id: nb.id }) } },
                        ]} />
                      </>
                    )}
                  </div>
                  {nbOpen && (
                    <ul className="tl sub" role="group">
                      {secs.map((s) => {
                        const activeSec = s.id === state.sectionId
                        const secOpen = isOpen(s.id, activeSec)
                        const pages = state.pages.filter((p) => p.sectionId === s.id)
                        return (
                          <li key={s.id} role="treeitem" aria-expanded={secOpen}>
                            <div className={`tn sec ${activeSec ? 'active' : ''}`} style={{ ['--sc' as string]: s.color }}>
                              <button className="chev-btn" aria-label={secOpen ? 'Collapse section' : 'Expand section'} onClick={() => setO(s.id, !secOpen)}>
                                <ChevronRight size={14} className={secOpen ? 'rot' : ''} />
                              </button>
                              <button className="tn-main" onDoubleClick={() => setEditing(s.id)}
                                onClick={() => {
                                  if (!activeSec) { dispatch({ t: 'selectNotebook', id: nb.id }); dispatch({ t: 'selectSection', id: s.id }); setO(s.id, true) } else setO(s.id, !secOpen)
                                }}>
                                <i className="sdot" />
                                {editing === s.id ? (
                                  <InlineEdit value={s.name} onCancel={() => setEditing(null)}
                                    onCommit={(v) => { dispatch({ t: 'renameSection', id: s.id, name: v }); setEditing(null) }} />
                                ) : (<span className="tn-name">{s.name}</span>)}
                                {editing !== s.id && <span className="count">{pages.length}</span>}
                              </button>
                              {editing !== s.id && (
                                <>
                                  <button className="icon-btn sm add" aria-label={`New page in ${s.name}`} title="New page" onClick={() => addPage(s.id, nb.id)}><FilePlus2 size={15} /></button>
                                  <RowMenu label={`Section options for ${s.name}`} items={[
                                    { label: 'New page', icon: <FilePlus2 size={14} />, onClick: () => addPage(s.id, nb.id) },
                                    { label: 'Rename', icon: <Pencil size={14} />, onClick: () => setEditing(s.id) },
                                    { label: 'Delete section', icon: <Trash2 size={14} />, danger: true, disabled: secs.length <= 1,
                                      onClick: () => { if (confirm(`Delete section "${s.name}" and its pages?`)) { dispatch({ t: 'selectNotebook', id: nb.id }); dispatch({ t: 'deleteSection', id: s.id }) } } },
                                  ]} />
                                </>
                              )}
                            </div>
                            {secOpen && (
                              <ul className="tl sub" role="group">
                                {pages.map((p) => pageRow(p))}
                                {!pages.length && <li className="tn-empty">No pages yet</li>}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <button className="new-btn" onClick={addNotebook}><Plus size={16} /><span>New notebook</span></button>
        </div>
      )}

      <div className="foot">
        <button className="foot-row" onClick={() => dispatch({ t: 'theme', theme: dark ? 'light' : 'dark' })} title="Toggle light / dark theme">
          {dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button className="foot-row" onClick={onSettings}>
          <Settings size={17} /><span>Settings</span>
        </button>
        <div className="profile" title={account.label}>
          <div className="avatar">{account.initials}</div>
          <div className="who"><b>{account.label}</b><span>{account.sub}</span></div>
        </div>
      </div>
    </aside>
  )
}

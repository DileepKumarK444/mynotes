import { useEffect, useReducer, useState } from 'react'
import { uuid } from './lib/ids'
import { seed } from './seed'
import type { IconKey, State, Theme } from './types'

const KEY = 'mynotes-poc-v1'
export const uid = uuid
export const PALETTE = ['#7b2fbe', '#2f6fde', '#0f8b8d', '#3d9a4a', '#d9a21b', '#d9622b', '#c2418c']
export const ICONS: IconKey[] = ['briefcase', 'home', 'graduation', 'plane', 'book', 'lightbulb']

export type Action =
  | { t: 'selectNotebook'; id: string }
  | { t: 'selectSection'; id: string }
  | { t: 'selectPage'; id: string }
  | { t: 'addNotebook'; id: string }
  | { t: 'renameNotebook'; id: string; name: string }
  | { t: 'deleteNotebook'; id: string }
  | { t: 'colorNotebook'; id: string; color: string }
  | { t: 'colorSection'; id: string; color: string }
  | { t: 'addSection'; id: string }
  | { t: 'renameSection'; id: string; name: string }
  | { t: 'deleteSection'; id: string }
  | { t: 'addPage'; id: string }
  | { t: 'renamePage'; id: string; title: string }
  | { t: 'deletePage'; id: string }
  | { t: 'toggleFav'; id: string }
  | { t: 'setHtml'; id: string; html: string }
  | { t: 'openPage'; id: string }
  | { t: 'theme'; theme: Theme }
  | { t: 'reset' }
  | { t: 'replaceAll'; state: State }

const blank = (_title: string) => '<p><br></p>'

function firstPageOf(s: State, sectionId: string) {
  return s.pages.find((p) => p.sectionId === sectionId)?.id ?? ''
}
function selectSection(s: State, sectionId: string): State {
  return { ...s, sectionId, pageId: firstPageOf(s, sectionId) }
}
function selectNotebook(s: State, id: string): State {
  const sec = s.sections.find((x) => x.notebookId === id)
  return selectSection({ ...s, notebookId: id }, sec?.id ?? '')
}

function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'selectNotebook': return selectNotebook(s, a.id)
    case 'selectSection': return selectSection(s, a.id)
    case 'selectPage': return { ...s, pageId: a.id }
    case 'openPage': {
      const pg = s.pages.find((p) => p.id === a.id)
      const sec = s.sections.find((x) => x.id === pg?.sectionId)
      if (!pg || !sec) return s
      return { ...s, notebookId: sec.notebookId, sectionId: sec.id, pageId: pg.id }
    }
    case 'addNotebook': {
      const id = a.id, sid = uid(), pid = uid()
      const n = s.notebooks.length
      const color = PALETTE[n % PALETTE.length]
      return {
        ...s,
        notebooks: [...s.notebooks, { id, name: 'New notebook', color, icon: ICONS[n % ICONS.length] }],
        sections: [...s.sections, { id: sid, notebookId: id, name: 'New section', color }],
        pages: [...s.pages, { id: pid, sectionId: sid, title: 'Untitled page', html: blank('Untitled page'), fav: false, updated: Date.now() }],
        notebookId: id, sectionId: sid, pageId: pid,
      }
    }
    case 'renameNotebook':
      return { ...s, notebooks: s.notebooks.map((n) => (n.id === a.id ? { ...n, name: a.name.trim() || n.name } : n)) }
    case 'colorNotebook':
      return { ...s, notebooks: s.notebooks.map((n) => (n.id === a.id ? { ...n, color: a.color } : n)) }
    case 'colorSection':
      return { ...s, sections: s.sections.map((x) => (x.id === a.id ? { ...x, color: a.color } : x)) }
    case 'deleteNotebook': {
      if (s.notebooks.length <= 1) return s
      const secIds = s.sections.filter((x) => x.notebookId === a.id).map((x) => x.id)
      const next: State = {
        ...s,
        notebooks: s.notebooks.filter((n) => n.id !== a.id),
        sections: s.sections.filter((x) => x.notebookId !== a.id),
        pages: s.pages.filter((p) => !secIds.includes(p.sectionId)),
      }
      return s.notebookId === a.id ? selectNotebook(next, next.notebooks[0].id) : next
    }
    case 'addSection': {
      const id = a.id, pid = uid()
      const count = s.sections.filter((x) => x.notebookId === s.notebookId).length
      return {
        ...s,
        sections: [...s.sections, { id, notebookId: s.notebookId, name: 'New section', color: PALETTE[(count + 2) % PALETTE.length] }],
        pages: [...s.pages, { id: pid, sectionId: id, title: 'Untitled page', html: blank('Untitled page'), fav: false, updated: Date.now() }],
        sectionId: id, pageId: pid,
      }
    }
    case 'renameSection':
      return { ...s, sections: s.sections.map((x) => (x.id === a.id ? { ...x, name: a.name.trim() || x.name } : x)) }
    case 'deleteSection': {
      const rest = s.sections.filter((x) => x.notebookId === s.notebookId && x.id !== a.id)
      if (!rest.length) return s
      const next = { ...s, sections: s.sections.filter((x) => x.id !== a.id), pages: s.pages.filter((p) => p.sectionId !== a.id) }
      return s.sectionId === a.id ? selectSection(next, rest[0].id) : next
    }
    case 'addPage': {
      if (!s.sectionId) return s
      const id = a.id
      return {
        ...s,
        pages: [...s.pages, { id, sectionId: s.sectionId, title: 'Untitled page', html: blank('Untitled page'), fav: false, updated: Date.now() }],
        pageId: id,
      }
    }
    case 'renamePage':
      return {
        ...s,
        pages: s.pages.map((p) => (p.id === a.id ? { ...p, title: a.title, updated: Date.now() } : p)),
      }
    case 'deletePage': {
      const pages = s.pages.filter((p) => p.id !== a.id)
      const next = { ...s, pages }
      if (s.pageId !== a.id) return next
      const sib = pages.filter((p) => p.sectionId === s.sectionId)
      return { ...next, pageId: sib[0]?.id ?? '' }
    }
    case 'toggleFav':
      return { ...s, pages: s.pages.map((p) => (p.id === a.id ? { ...p, fav: !p.fav } : p)) }
    case 'setHtml':
      return { ...s, pages: s.pages.map((p) => (p.id === a.id ? { ...p, html: a.html, updated: Date.now() } : p)) }
    case 'theme': return { ...s, theme: a.theme }
    case 'reset': return { ...seed(), theme: s.theme }
    case 'replaceAll': return a.state
  }
}

export const THEME_KEY = 'mynotes-theme'
const initialTheme = (): Theme => {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Demo mode: everything lives in this browser (the POC behaviour). */
export function loadDemo(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...(JSON.parse(raw) as State), theme: initialTheme() }
  } catch { /* storage unavailable: fall back to sample data */ }
  return { ...seed(), theme: initialTheme() }
}

/** Local mode: the file written by the dev/preview server wins; falls back to the browser copy, then a fresh start. */
export async function loadLocal(): Promise<State> {
  try {
    const r = await fetch('/api/local-state')
    if (r.ok) return { ...((await r.json()) as State), theme: initialTheme() }
  } catch { /* server route unavailable: use browser storage */ }
  let browser: State | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) browser = JSON.parse(raw) as State
  } catch { /* ignore */ }
  return { ...(browser ?? starterState(true)), theme: initialTheme() }
}

export async function saveLocal(state: State): Promise<void> {
  const json = JSON.stringify(state)
  try { localStorage.setItem(KEY, json) } catch { /* quota: the file below is the real store */ }
  const r = await fetch('/api/local-state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: json })
  if (!r.ok) throw new Error(`Could not write notes file (${r.status})`)
}

/** A sensible first notebook for brand-new cloud accounts. */
export function starterState(local = false): State {
  const nb = uuid(), sec = uuid(), pg = uuid()
  return {
    notebooks: [{ id: nb, name: 'My first notebook', color: '#7b2fbe', icon: 'book' }],
    sections: [{ id: sec, notebookId: nb, name: 'Getting started', color: '#7b2fbe' }],
    pages: [{
      id: pg, sectionId: sec, title: 'Welcome to MyNotes', fav: true, updated: Date.now(),
      html: '<h2>Welcome</h2><p>This is your first page. '+(local ? 'Everything you write is saved on this computer.' : 'Everything you write here syncs to your account.')+'</p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Create a notebook for something you care about</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Try the formatting toolbar, tables and images</p></div></li></ul>',
    }],
    notebookId: nb, sectionId: sec, pageId: pg, theme: initialTheme(),
  }
}

const uiKey = (userId: string) => `mynotes-ui-${userId}`
/** Restores the last open notebook/section/page for a cloud user, when still valid. */
export function withSavedSelection(s: State, userId: string): State {
  try {
    const sel = JSON.parse(localStorage.getItem(uiKey(userId)) ?? 'null') as Pick<State, 'notebookId' | 'sectionId' | 'pageId'> | null
    if (sel && s.pages.some((p) => p.id === sel.pageId)) return { ...s, ...sel }
  } catch { /* ignore */ }
  const first = s.pages[0]
  const sec = s.sections.find((x) => x.id === first?.sectionId)
  return first && sec ? { ...s, notebookId: sec.notebookId, sectionId: sec.id, pageId: first.id } : s
}

export function useNotes(initial: State, mode: 'demo' | 'cloud', userId?: string) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [local, setLocal] = useState<{ status: 'idle' | 'error'; error: string }>({ status: 'idle', error: '' })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, state.theme) } catch { /* ignore */ }
  }, [state.theme])
  useEffect(() => {
    const t = setTimeout(() => {
      if (mode === 'demo') {
        if (state === initial && tick === 0) return
        saveLocal(state).then(() => setLocal({ status: 'idle', error: '' }))
          .catch((e: unknown) => setLocal({ status: 'error', error: e instanceof Error ? e.message : 'Save failed' }))
      } else if (userId) {
        try { localStorage.setItem(uiKey(userId), JSON.stringify({ notebookId: state.notebookId, sectionId: state.sectionId, pageId: state.pageId })) } catch { /* ignore */ }
      }
    }, 250)
    return () => clearTimeout(t)
  }, [state, mode, userId, initial, tick])
  return [state, dispatch, { ...local, retry: () => setTick((n) => n + 1) }] as const
}

export const textOf = (html: string) => {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent ?? ''
}

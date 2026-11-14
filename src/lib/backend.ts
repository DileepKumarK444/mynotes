import { plainText } from './html'
import { supabase } from './supabase'
import type { IconKey, Notebook, Page, Section } from '../types'

export interface Data { notebooks: Notebook[]; sections: Section[]; pages: Page[] }
export interface SearchHit { id: string; title: string; snippet: string; sectionId: string }

const db = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

/** Loads everything the signed-in user owns (RLS guarantees only their rows come back). */
export async function loadAll(): Promise<Data> {
  const c = db()
  const [nb, sec, pg] = await Promise.all([
    c.from('notebooks').select('id,name,color,icon,created_at').order('created_at'),
    c.from('sections').select('id,notebook_id,name,color,created_at').order('created_at'),
    c.from('pages').select('id,section_id,title,content_html,is_favorite,updated_at,created_at').order('created_at'),
  ])
  fail(nb.error); fail(sec.error); fail(pg.error)
  return {
    notebooks: (nb.data ?? []).map((n) => ({ id: n.id, name: n.name, color: n.color, icon: n.icon as IconKey })),
    sections: (sec.data ?? []).map((s) => ({ id: s.id, notebookId: s.notebook_id, name: s.name, color: s.color })),
    pages: (pg.data ?? []).map((p) => ({
      id: p.id, sectionId: p.section_id, title: p.title, html: p.content_html,
      fav: p.is_favorite, updated: new Date(p.updated_at).getTime(),
    })),
  }
}

export type { Changes } from './backend-types'
import type { Changes } from './backend-types'

/** Writes a batch of changes. Parents first so foreign keys are satisfied. */
export async function push(ch: Changes): Promise<void> {
  const c = db()
  if (ch.notebooks.length) {
    fail((await c.from('notebooks').upsert(ch.notebooks.map((n) => ({ id: n.id, name: n.name, color: n.color, icon: n.icon }))) ).error)
  }
  if (ch.sections.length) {
    fail((await c.from('sections').upsert(ch.sections.map((s) => ({ id: s.id, notebook_id: s.notebookId, name: s.name, color: s.color })))).error)
  }
  if (ch.pages.length) {
    fail((await c.from('pages').upsert(ch.pages.map((p) => ({
      id: p.id, section_id: p.sectionId, title: p.title, content_html: p.html,
      content_text: plainText(p.html), is_favorite: p.fav,
    })))).error)
  }
  // Deleting a parent cascades; children are deleted explicitly first so partial failures stay consistent.
  if (ch.deleted.pages.length) fail((await c.from('pages').delete().in('id', ch.deleted.pages)).error)
  if (ch.deleted.sections.length) fail((await c.from('sections').delete().in('id', ch.deleted.sections)).error)
  if (ch.deleted.notebooks.length) fail((await c.from('notebooks').delete().in('id', ch.deleted.notebooks)).error)
}

export async function searchPages(q: string): Promise<SearchHit[]> {
  const { data, error } = await db().rpc('search_pages', { q, max_results: 30 })
  fail(error)
  return ((data ?? []) as { id: string; title: string; snippet: string; section_id: string }[]).map((r) => ({
    id: r.id, title: r.title, snippet: r.snippet, sectionId: r.section_id,
  }))
}

const MAX_IMAGE = 5 * 1024 * 1024

/** Uploads an image to the user's own folder in Storage and returns its public URL. */
export async function uploadImage(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be inserted')
  if (file.size > MAX_IMAGE) throw new Error('Images must be 5 MB or smaller')
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const c = db()
  const { error } = await c.storage.from('note-images').upload(path, file, { contentType: file.type, upsert: false })
  fail(error)
  return c.storage.from('note-images').getPublicUrl(path).data.publicUrl
}

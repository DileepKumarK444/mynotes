import type { Notebook, Page, Section, State } from '../types'
import type { Changes } from './backend-types'

export type Tables = Pick<State, 'notebooks' | 'sections' | 'pages'>

export function diff<T extends { id: string }>(prev: T[], next: T[]) {
  const before = new Map(prev.map((x) => [x.id, x]))
  const ids = new Set(next.map((x) => x.id))
  const changed = next.filter((x) => before.get(x.id) !== x)
  const removed = prev.filter((x) => !ids.has(x.id)).map((x) => x.id)
  return { changed, removed }
}

export const isEmpty = (q: Changes) =>
  !q.notebooks.length && !q.sections.length && !q.pages.length &&
  !q.deleted.notebooks.length && !q.deleted.sections.length && !q.deleted.pages.length

export const empty = (): Changes => ({ notebooks: [], sections: [], pages: [], deleted: { notebooks: [], sections: [], pages: [] } })

export function merge(into: Changes, add: Changes) {
  const upsert = <T extends { id: string }>(a: T[], b: T[]) => {
    const m = new Map(a.map((x) => [x.id, x])); b.forEach((x) => m.set(x.id, x)); return [...m.values()]
  }
  into.notebooks = upsert<Notebook>(into.notebooks, add.notebooks)
  into.sections = upsert<Section>(into.sections, add.sections)
  into.pages = upsert<Page>(into.pages, add.pages)
  for (const k of ['notebooks', 'sections', 'pages'] as const) {
    into.deleted[k] = [...new Set([...into.deleted[k], ...add.deleted[k]])]
    // A row deleted after being edited must not be re-created by the queued upsert.
    ;(into[k] as { id: string }[]) = (into[k] as { id: string }[]).filter((x) => !into.deleted[k].includes(x.id))
  }
}


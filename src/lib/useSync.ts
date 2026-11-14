import { useCallback, useEffect, useRef, useState } from 'react'
import { push, type Data } from './backend'
import type { Changes } from './backend-types'
import { diff, empty, isEmpty, merge, type Tables } from './changes'

export type SyncStatus = 'idle' | 'pending' | 'saving' | 'error'

/**
 * Watches app state and pushes changed rows to the backend (debounced, with retry).
 * `baseline` is what the server already has; anything different is sent.
 */
export function useSync(state: Tables, baseline: Data, enabled: boolean) {
  const prev = useRef<Tables>(baseline as Tables)
  const queue = useRef<Changes>(empty())
  const timer = useRef<number | undefined>(undefined)
  const busy = useRef(false)
  const attempts = useRef(0)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastError, setLastError] = useState('')

  const flushRef = useRef<() => Promise<void>>(async () => {})
  const flush = useCallback(async () => {
    if (busy.current) return
    const q = queue.current
    if (isEmpty(q)) { setStatus('idle'); return }
    busy.current = true
    queue.current = empty()
    setStatus('saving')
    try {
      await push(q)
      attempts.current = 0
      busy.current = false
      if (isEmpty(queue.current)) setStatus('idle')
      else void flushRef.current() // edits arrived while saving
    } catch (e) {
      busy.current = false
      merge(q, queue.current) // keep newer edits queued on top of the failed batch
      queue.current = q
      attempts.current += 1
      setLastError(e instanceof Error ? e.message : 'Unknown error')
      setStatus('error')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => { timer.current = undefined; void flushRef.current() }, Math.min(30000, 2000 * 2 ** attempts.current))
    }
  }, [])
  useEffect(() => { flushRef.current = flush }, [flush])

  useEffect(() => {
    if (!enabled) return
    const n = diff(prev.current.notebooks, state.notebooks)
    const s = diff(prev.current.sections, state.sections)
    const p = diff(prev.current.pages, state.pages)
    prev.current = { notebooks: state.notebooks, sections: state.sections, pages: state.pages }
    if (!n.changed.length && !s.changed.length && !p.changed.length && !n.removed.length && !s.removed.length && !p.removed.length) return
    merge(queue.current, {
      notebooks: n.changed, sections: s.changed, pages: p.changed,
      deleted: { notebooks: n.removed, sections: s.removed, pages: p.removed },
    })
    setStatus((cur) => (cur === 'saving' || cur === 'error' ? cur : 'pending'))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { timer.current = undefined; void flush() }, 800)
  }, [state.notebooks, state.sections, state.pages, enabled, flush])

  // Warn before closing the tab while changes are unsaved.
  useEffect(() => {
    if (!enabled) return
    const h = (e: BeforeUnloadEvent) => { if (status !== 'idle') e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [status, enabled])

  // Retry immediately when the connection comes back.
  useEffect(() => {
    if (!enabled) return
    const h = () => { window.clearTimeout(timer.current); timer.current = undefined; void flush() }
    window.addEventListener('online', h)
    return () => window.removeEventListener('online', h)
  }, [enabled, flush])

  return { status, lastError, retry: flush }
}

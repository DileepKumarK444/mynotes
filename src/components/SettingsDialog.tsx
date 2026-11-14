import { Download, LogOut, Moon, RotateCcw, Sun, X } from 'lucide-react'
import { useEffect } from 'react'
import type { State } from '../types'

interface Props {
  state: State
  mode: 'demo' | 'cloud'
  email?: string
  onClose: () => void
  onTheme: (t: 'light' | 'dark') => void
  onSignOut: () => void
  onReset: () => void
}

export function SettingsDialog({ state, mode, email, onClose, onTheme, onSignOut, onReset }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const exportJson = () => {
    const data = { exportedAt: new Date().toISOString(), notebooks: state.notebooks, sections: state.sections, pages: state.pages }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'mynotes-export.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <header>
          <h2>Settings</h2>
          <button className="icon-btn" aria-label="Close settings" onClick={onClose}><X size={18} /></button>
        </header>
        <section>
          <h3>Appearance</h3>
          <div className="seg">
            <button className={state.theme === 'light' ? 'on' : ''} onClick={() => onTheme('light')}><Sun size={15} /> Light</button>
            <button className={state.theme === 'dark' ? 'on' : ''} onClick={() => onTheme('dark')}><Moon size={15} /> Dark</button>
          </div>
        </section>
        <section>
          <h3>Account</h3>
          {mode === 'cloud' ? (
            <>
              <p className="muted">Signed in as <b>{email}</b>. Your notes sync automatically.</p>
              <button className="btn" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
            </>
          ) : (
            <p className="muted">Local-only mode: notes are saved to <code>data/notes.json</code> inside the MyNotes folder on this computer. Nothing is sent anywhere. Back that file up, or use Export below, to keep a copy.</p>
          )}
        </section>
        <section>
          <h3>Your data</h3>
          <button className="btn" onClick={exportJson}><Download size={15} /> Export everything (JSON)</button>
          {mode === 'demo' && (
            <button className="btn danger" onClick={() => { if (confirm('Erase all notes and restore the sample notebooks? This cannot be undone.')) { onReset(); onClose() } }}>
              <RotateCcw size={15} /> Reset to sample data
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

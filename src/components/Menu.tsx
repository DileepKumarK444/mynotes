import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

const SWATCHES = ['#7b2fbe', '#2f6fde', '#0f8b8d', '#3d9a4a', '#d9a21b', '#d9622b', '#c2418c', '#5f5968']

interface ColorPick { value: string; onPick: (c: string) => void }

export function RowMenu({ items, label, color }: { items: MenuItem[]; label: string; color?: ColorPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="rowmenu" ref={ref}>
      <button
        className="icon-btn sm more"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="menu" role="menu">
          {color && (
            <div className="swatches" role="group" aria-label="Colour">
              {SWATCHES.map((c) => (
                <button key={c} type="button" role="menuitemradio" aria-checked={color.value === c} aria-label={`Colour ${c}`}
                  className={`sw ${color.value === c ? 'on' : ''}`} style={{ background: c }}
                  onClick={(e) => { e.stopPropagation(); color.onPick(c); setOpen(false) }} />
              ))}
            </div>
          )}
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              disabled={it.disabled}
              className={it.danger ? 'danger' : ''}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick() }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

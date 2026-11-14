import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onCommit: (v: string) => void
  onCancel: () => void
  className?: string
}

export function InlineEdit({ value, onCommit, onCancel, className }: Props) {
  const [v, setV] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const finish = (ok: boolean) => {
    if (done.current) return
    done.current = true
    if (ok) onCommit(v)
    else onCancel()
  }
  return (
    <input
      ref={ref}
      className={`inline-edit ${className ?? ''}`}
      value={v}
      aria-label="Rename"
      onChange={(e) => setV(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true)
        if (e.key === 'Escape') finish(false)
      }}
      onBlur={() => finish(true)}
    />
  )
}

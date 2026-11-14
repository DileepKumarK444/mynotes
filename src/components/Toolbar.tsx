import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { Bold, Heading1, Heading2, Highlighter, Image as ImageIcon, Italic, List, ListChecks, ListOrdered, Pilcrow, Redo2, Strikethrough, Table, Underline, Undo2 } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`tb ${active ? 'on' : ''}`} aria-label={label} aria-pressed={active} title={label} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  )
}

export function Toolbar({ editor, onImage }: { editor: Editor | null; onImage: (file: File) => void }) {
  const file = useRef<HTMLInputElement>(null)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: !!e?.isActive('bold'), italic: !!e?.isActive('italic'), underline: !!e?.isActive('underline'),
      strike: !!e?.isActive('strike'), hl: !!e?.isActive('highlight'), ul: !!e?.isActive('bulletList'),
      ol: !!e?.isActive('orderedList'), task: !!e?.isActive('taskList'), table: !!e?.isActive('table'),
      h2: !!e?.isActive('heading', { level: 2 }), h3: !!e?.isActive('heading', { level: 3 }),
      undo: !!e?.can().undo(), redo: !!e?.can().redo(),
    }),
  })
  const c = () => editor?.chain().focus()
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="grp">
        <Btn label="Undo" disabled={!s?.undo} onClick={() => c()?.undo().run()}><Undo2 size={17} /></Btn>
        <Btn label="Redo" disabled={!s?.redo} onClick={() => c()?.redo().run()}><Redo2 size={17} /></Btn>
      </div>
      <i className="sep" />
      <div className="grp">
        <Btn label="Heading 1" active={s?.h2} onClick={() => c()?.toggleHeading({ level: 2 }).run()}><Heading1 size={18} /></Btn>
        <Btn label="Heading 2" active={s?.h3} onClick={() => c()?.toggleHeading({ level: 3 }).run()}><Heading2 size={18} /></Btn>
        <Btn label="Body text" onClick={() => c()?.setParagraph().run()}><Pilcrow size={17} /></Btn>
      </div>
      <i className="sep" />
      <div className="grp">
        <Btn label="Bold" active={s?.bold} onClick={() => c()?.toggleBold().run()}><Bold size={17} /></Btn>
        <Btn label="Italic" active={s?.italic} onClick={() => c()?.toggleItalic().run()}><Italic size={17} /></Btn>
        <Btn label="Underline" active={s?.underline} onClick={() => c()?.toggleUnderline().run()}><Underline size={17} /></Btn>
        <Btn label="Strikethrough" active={s?.strike} onClick={() => c()?.toggleStrike().run()}><Strikethrough size={17} /></Btn>
        <Btn label="Highlight" active={s?.hl} onClick={() => c()?.toggleHighlight().run()}><Highlighter size={17} /></Btn>
      </div>
      <i className="sep" />
      <div className="grp">
        <Btn label="Bulleted list" active={s?.ul} onClick={() => c()?.toggleBulletList().run()}><List size={18} /></Btn>
        <Btn label="Numbered list" active={s?.ol} onClick={() => c()?.toggleOrderedList().run()}><ListOrdered size={18} /></Btn>
        <Btn label="Checklist" active={s?.task} onClick={() => c()?.toggleTaskList().run()}><ListChecks size={18} /></Btn>
      </div>
      <i className="sep" />
      <div className="grp">
        <Btn label="Insert table" active={s?.table} onClick={() => c()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table size={17} /></Btn>
        <Btn label="Insert image" onClick={() => file.current?.click()}><ImageIcon size={17} /></Btn>
        {s?.table && (
          <>
            <button type="button" className="tb txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c()?.addRowAfter().run()}>+ Row</button>
            <button type="button" className="tb txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c()?.addColumnAfter().run()}>+ Column</button>
            <button type="button" className="tb txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c()?.deleteRow().run()}>− Row</button>
            <button type="button" className="tb txt" onMouseDown={(e) => e.preventDefault()} onClick={() => c()?.deleteTable().run()}>Delete table</button>
          </>
        )}
        <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.target.value = '' }} />
      </div>
    </div>
  )
}

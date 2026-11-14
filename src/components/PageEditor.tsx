import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { migrateLegacyHtml } from '../lib/html'
import type { Page } from '../types'
import { Toolbar } from './Toolbar'

interface Props {
  page: Page
  onHtml: (html: string) => void
  onTitle: (title: string) => void
  uploadImage: (file: File) => Promise<string>
  onError: (msg: string) => void
}

export function PageEditor({ page, onHtml, onTitle, uploadImage, onError }: Props) {
  // Latest callbacks, so the editor (created once per page) never calls stale closures.
  const cb = useRef({ onHtml, uploadImage, onError })
  useEffect(() => { cb.current = { onHtml, uploadImage, onError } })
  const ed = useRef<Editor | null>(null)

  const insertFiles = (files: File[], pos?: number) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    imgs.forEach(async (f) => {
      try {
        const src = await cb.current.uploadImage(f)
        const e = ed.current
        if (!e) return
        const chain = e.chain().focus()
        if (pos !== undefined) chain.setTextSelection(pos)
        chain.setImage({ src, alt: f.name }).run()
      } catch (err) {
        cb.current.onError(err instanceof Error ? err.message : 'Could not insert the image')
      }
    })
    return imgs.length > 0
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Image.configure({ allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: 'Start typing…' }),
    ],
    content: migrateLegacyHtml(page.html),
    editorProps: {
      attributes: { 'aria-label': 'Note content', role: 'textbox', 'aria-multiline': 'true' },
      handlePaste: (_v, event) => {
        const files = [...(event.clipboardData?.files ?? [])]
        return files.length ? insertFiles(files) : false
      },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])]
        if (!files.length) return false
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        return insertFiles(files, pos)
      },
    },
    onUpdate: ({ editor }) => cb.current.onHtml(editor.getHTML()),
  })
  useEffect(() => { ed.current = editor }, [editor])

  return (
    <>
      <Toolbar editor={editor} onImage={(f) => insertFiles([f])} />
      <div className="canvas-scroll">
        <article className="canvas">
          <input className="title" value={page.title} placeholder="Untitled page" aria-label="Page title"
            onChange={(e) => onTitle(e.target.value)} />
          <div className="stamp">
            <Check size={13} /> Last edited {new Date(page.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          <EditorContent editor={editor} className="editor" />
        </article>
      </div>
    </>
  )
}

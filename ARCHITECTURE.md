# MyNotes – Architecture Proposal (Stage 1)

> Status: **full development in progress** (POC approved). See README.md for setup; the Supabase schema is in `supabase/migrations`.

## 1. Existing environment
- Machine: macOS, Node 22, npm 10. `~/Developer` holds the user's projects (not iCloud-synced), so MyNotes lives in `~/Developer/mynotes`.
- No prior MyNotes code existed; the POC started from a clean Vite scaffold.

## 2. Recommended stack
| Concern | POC (now) | Full product (after approval) |
|---|---|---|
| UI | React 19 + TypeScript + Vite | same |
| Styling | Hand-written CSS with design tokens (CSS variables) | same (optionally Tailwind) |
| Icons | lucide-react (one consistent line-icon set) | same |
| Editor | `contentEditable` + `execCommand` (simulated rich text) | **TipTap (ProseMirror)** – checklists, tables, images, collaboration-ready |
| State | `useReducer` + localStorage | Zustand / TanStack Query against Supabase |
| Auth | none (simulated profile) | Supabase Auth (email + OAuth) |
| Database | localStorage | Supabase Postgres with Row Level Security |
| Files | image placeholder | Supabase Storage |
| Search | in-memory filter | Postgres full-text search (`tsvector` + GIN) |
| Hosting | local Vite dev server | Vercel |

## 3. Folder structure
```
mynotes/
├─ ARCHITECTURE.md
├─ index.html
├─ src/
│  ├─ main.tsx            entry
│  ├─ App.tsx             layout shell, theme, mobile drawers
│  ├─ types.ts            Notebook / Section / Page models
│  ├─ seed.ts             sample data (simulated)
│  ├─ store.ts            reducer + localStorage persistence
│  ├─ styles.css          tokens, light/dark themes, layout
│  └─ components/
│     ├─ NotebookSidebar.tsx   column 1
│     ├─ PagePane.tsx          column 2 (sections, pages, search)
│     ├─ Workspace.tsx         column 3 (title, toolbar, canvas)
│     ├─ Toolbar.tsx           formatting toolbar
│     ├─ InlineEdit.tsx        rename-in-place input
│     └─ Menu.tsx              small context menu
```

## 4. Screens
1. **Workspace** (main): three columns – notebooks / sections + pages / editor.
2. **Search results** (state of column 2): matches across all notebooks.
3. **Mobile**: columns become slide-over drawers, editor fills the screen.
4. *(Full product only)* Sign-in, Settings, Trash, Share dialog.

## 5. Core functionality
Notebooks, sections and pages (create / rename / delete / switch), rich-text editing, checklists, tables, favourites, search, collapsible panes, light/dark theme, autosave indicator.

## 6. Database architecture (full product, Supabase)
```
profiles(id → auth.users, display_name, avatar_url)
notebooks(id, owner_id, name, color, icon, position, created_at)
sections(id, notebook_id, name, color, position)
pages(id, section_id, title, content jsonb, content_text text,
      is_favorite bool, position, updated_at, search tsvector)
attachments(id, page_id, storage_path, mime, size)
```
- RLS: every row is reachable only when `owner_id = auth.uid()` (or via a future `shares` table).
- Autosave: debounced `update pages set content=…`; optimistic UI.
- Hierarchy mirrors the POC types exactly, so the POC data model carries over.

## 7. Navigation flow
Pick a notebook (col 1) → pick a section tab (col 2) → pick a page (col 2) → edit (col 3).
Search (col 2) jumps straight to a page in any notebook. Panes collapse for focus mode.

## 8. Simulated in the POC
See the in-app "POC" badge and the list in the final report: persistence is localStorage only; the profile, sync indicator, sharing and settings are visual stand-ins; rich text uses the browser's legacy `execCommand`.

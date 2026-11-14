# MyNotes

A OneNote-inspired note-taking app: notebooks → sections → pages, rich text (TipTap), checklists, tables, images, full-text search, light/dark themes. React 19 + TypeScript + Vite on the front end, Supabase (Auth, Postgres, Storage) as the backend.

Without Supabase configured the app still runs in **local demo mode** (notes live in your browser only).

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

## Set up Supabase (one time)

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/migrations/20261114000000_init.sql`
   (or `supabase db push` with the CLI). It creates the tables, Row Level Security policies, full-text search (`search_pages`), and the `note-images` storage bucket with per-user upload policies.
3. **Authentication → URL Configuration**: add your local URL (`http://localhost:5173`) and production URL to *Site URL / Redirect URLs* so confirmation and reset emails return to the app.
4. Copy **Project URL** and the **anon public key** (Project Settings → API) into `.env.local`.

The anon key is designed to be public; every table has RLS so users can only reach their own rows. Never put the `service_role` key in this app.

## Deploy to Vercel

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | type-check + production build |
| `npm run lint` | oxlint |

## How sync works

`src/lib/useSync.ts` watches app state, diffs it against what the server last had (`src/lib/changes.ts`), and pushes only changed rows (debounced, coalesced, parents before children). Failures keep the batch queued and retry with exponential back-off; the header shows "Not saved · Retry" and the tab warns before closing with unsaved changes.

## Known limits / roadmap

- All of a user's pages are loaded at sign-in. Fine for personal use; switch to lazy-loading page content for very large accounts.
- Sync is last-write-wins per page; there is no real-time multi-device merge yet.
- Images are stored in a public-read bucket under unguessable paths (writes are restricted to the owner's folder).
- Account deletion and sharing are not implemented.

-- MyNotes initial schema: notebooks > sections > pages, per-user via RLS.


create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  color text not null default '#7b2fbe',
  icon text not null default 'book',
  created_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  color text not null default '#7b2fbe',
  created_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 300),
  content_html text not null default '',
  content_text text not null default '',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
  ) stored
);

create index sections_notebook_idx on public.sections (notebook_id);
create index pages_section_idx on public.pages (section_id);
create index pages_owner_fav_idx on public.pages (owner_id) where is_favorite;
create index pages_search_idx on public.pages using gin (search);
create index notebooks_owner_idx on public.notebooks (owner_id);

-- Row Level Security: every row is reachable only by its owner.
alter table public.profiles  enable row level security;
alter table public.notebooks enable row level security;
alter table public.sections  enable row level security;
alter table public.pages     enable row level security;

create policy "own profile" on public.profiles for all
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own notebooks" on public.notebooks for all
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own sections" on public.sections for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
    and exists (select 1 from public.notebooks n where n.id = notebook_id and n.owner_id = (select auth.uid())));
create policy "own pages" on public.pages for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
    and exists (select 1 from public.sections s where s.id = section_id and s.owner_id = (select auth.uid())));

-- Keep updated_at honest regardless of what the client sends.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

-- Create a profile row on sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Full-text search. SECURITY INVOKER so RLS applies to the caller.
create function public.search_pages(q text, max_results int default 30)
returns table (id uuid, title text, snippet text, section_id uuid, rank real)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.title,
         ts_headline('english', p.content_text, websearch_to_tsquery('english', q),
                     'MaxWords=18, MinWords=8, StartSel=<<, StopSel=>>') as snippet,
         p.section_id,
         ts_rank(p.search, websearch_to_tsquery('english', q)) as rank
  from public.pages p
  where p.search @@ websearch_to_tsquery('english', q)
  order by rank desc, p.updated_at desc
  limit least(max_results, 100)
$$;

-- Image storage: public-read bucket, writes only inside the user's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', true, 5242880, array['image/png','image/jpeg','image/gif','image/webp'])
on conflict (id) do nothing;

create policy "users upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users manage own images" on storage.objects for delete to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

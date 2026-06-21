-- Content Architect board (June 02 review: Notion-style Kanban for content).
-- Run this in the Supabase SQL Editor. Same shape/conventions as the task board.
-- Anon-permissive RLS for now; the auth step will harden this to per-client.

create table if not exists public.content_posts (
  id            uuid primary key default gen_random_uuid(),
  client_id     text        not null,
  column_key    text        not null default 'idea'
                  check (column_key in ('idea', 'drafting', 'scheduled', 'published')),
  position      double precision not null default 0,
  title         text        not null,
  caption       text        not null default '',
  -- Free-text channel for now (e.g. Instagram, LinkedIn); a real picker later.
  channel       text        not null default '',
  -- Target publish date (YYYY-MM-DD), optional.
  scheduled_for text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists content_posts_client_column_idx
  on public.content_posts (client_id, column_key, position);

-- Reuse the set_updated_at() function created in 0001_tasks.sql.
drop trigger if exists content_posts_set_updated_at on public.content_posts;
create trigger content_posts_set_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();

alter table public.content_posts enable row level security;

drop policy if exists "content anon read"   on public.content_posts;
drop policy if exists "content anon write"  on public.content_posts;
drop policy if exists "content anon update" on public.content_posts;
drop policy if exists "content anon delete" on public.content_posts;

create policy "content anon read"   on public.content_posts for select using (true);
create policy "content anon write"  on public.content_posts for insert with check (true);
create policy "content anon update" on public.content_posts for update using (true) with check (true);
create policy "content anon delete" on public.content_posts for delete using (true);

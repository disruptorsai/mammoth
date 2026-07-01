-- Auto-blog automation (DisruptorsMedia Tue/Thu publishing).
-- A curated topic queue + an on/off toggle. api/cron-blog reads these; the queue
-- seed and the pg_cron schedule live in 0019_auto_blog_seed_cron.sql.

-- Curated blog-lane topics (primary keyword + secondaries), walked by priority.
create table if not exists public.blog_queue (
  id                 bigint generated always as identity primary key,
  client_id          text not null,
  title              text not null,
  primary_keyword    text not null,
  secondary_keywords text[] default '{}',
  cluster            text,
  intent             int,
  content_type       text default 'blog',
  priority           int default 2,           -- 1 = highest (published first)
  status             text not null default 'queued', -- queued | generating | published | skipped
  draft_id           uuid,                     -- content_drafts.id once generated
  post_slug          text,
  post_url           text,
  last_error         text,
  published_at       timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
create index if not exists idx_blog_queue_client_status
  on public.blog_queue(client_id, status, priority);

-- Per-client on/off switch (the Mammoth toggle writes `enabled`).
create table if not exists public.blog_automation (
  client_id     text primary key,
  enabled       boolean not null default false,
  posts_per_run int not null default 1,
  last_run_at   timestamptz,
  updated_at    timestamptz default now()
);

-- Toggle row for DisruptorsMedia — starts OFF until the review drafts are approved.
insert into public.blog_automation (client_id, enabled, posts_per_run)
values ('disruptors-media', false, 1)
on conflict (client_id) do nothing;

-- RLS (matches the project's current pattern; tighten to auth-scoped when login
-- fully lands). The queue is READ-ONLY to the browser — only the cron (service
-- role, bypasses RLS) and the seed SQL write it. The toggle needs client writes,
-- so blog_automation stays writable.
alter table public.blog_queue enable row level security;
alter table public.blog_automation enable row level security;

do $$ begin
  create policy blog_queue_read on public.blog_queue for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy blog_automation_all on public.blog_automation for all using (true) with check (true);
exception when duplicate_object then null; end $$;

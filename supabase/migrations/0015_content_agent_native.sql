-- Phase 1 of folding the SEO/GEO "Content Agent" into Mission Control as ONE
-- product: bring its data into THIS database. Every table is keyed by the
-- Mammoth client slug (text client_id, like tasks/leads/seo_keywords), not the
-- Content Agent UUID. RLS mirrors the app pattern: admins see all, client users
-- see their own (uses is_admin()/my_client_id() from 0004_auth.sql).
--
-- Run this in the Supabase SQL Editor (DDL). It is additive — it creates NEW
-- tables and never touches existing ones, so it is safe to re-run and easy to
-- roll back (drop the tables). Data is loaded by scripts/import-content-agent.mjs
-- (idempotent), which can be re-run to refresh until native generation (Phase 2)
-- lands.
--
-- Naming note: a couple of tables are prefixed to avoid colliding with existing
-- Mission Control tables (content_usage_ledger vs usage_events; content_jobs vs a
-- future generic jobs table). seo_keywords (the manual watchlist) is unrelated to
-- keyword_research (AI keyword research) and both coexist.

-- Generated content queue.
create table if not exists public.content_drafts (
  id            uuid primary key default gen_random_uuid(),
  client_id     text not null,
  content_type  text,
  topic         text,
  original      text,
  humanized     text,
  status        text not null default 'queued',
  model         text,
  cost_cents    integer not null default 0,
  image_storage_path text,
  wp_post_url   text,
  scheduled_at  timestamptz,
  source_id     uuid,                 -- original Content Agent row id (for idempotent re-import)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists content_drafts_client_idx on public.content_drafts (client_id, updated_at desc);
-- Plain (not partial) unique so upsert ON CONFLICT (source_id) can infer it;
-- Postgres treats multiple NULLs as distinct, so future native rows (no source) are fine.
create unique index if not exists content_drafts_source_idx on public.content_drafts (source_id);

-- AI keyword research cache.
create table if not exists public.keyword_research (
  id             uuid primary key default gen_random_uuid(),
  client_id      text not null,
  keyword        text not null,
  volume         integer,
  difficulty     integer,
  intent         text,
  leverage_score numeric,
  trend          jsonb,
  ttl_at         timestamptz,
  created_at     timestamptz not null default now(),
  unique (client_id, keyword)
);
create index if not exists keyword_research_client_idx on public.keyword_research (client_id, leverage_score desc nulls last);

-- SEO / PageSpeed audit reports.
create table if not exists public.seo_reports (
  id              uuid primary key default gen_random_uuid(),
  client_id       text not null,
  domain          text not null,
  report_json     jsonb,
  pdf_storage_path text,
  usage_billed    boolean not null default false,
  generated_at    timestamptz not null default now(),
  source_id       uuid,
  created_at      timestamptz not null default now()
);
create index if not exists seo_reports_client_idx on public.seo_reports (client_id, generated_at desc);
create unique index if not exists seo_reports_source_idx on public.seo_reports (source_id);

-- Site analysis runs (rankings + recommendations).
create table if not exists public.site_analyses (
  id               uuid primary key default gen_random_uuid(),
  client_id        text not null,
  domain           text not null,
  status           text not null default 'queued',
  current_rankings jsonb,
  recommendations  jsonb,
  error            text,
  generated_at     timestamptz not null default now(),
  finished_at      timestamptz,
  source_id        uuid
);
create index if not exists site_analyses_client_idx on public.site_analyses (client_id, generated_at desc);
create unique index if not exists site_analyses_source_idx on public.site_analyses (source_id);

-- Usage/cost audit log for content + SEO operations.
create table if not exists public.content_usage_ledger (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  event      text not null,
  cost_cents integer not null default 0,
  tokens     integer,
  metadata   jsonb,
  ts         timestamptz not null default now(),
  source_id  uuid
);
create index if not exists content_usage_ledger_client_idx on public.content_usage_ledger (client_id, ts desc);
create unique index if not exists content_usage_ledger_source_idx on public.content_usage_ledger (source_id);

-- Background generation jobs.
create table if not exists public.content_jobs (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  kind       text not null,
  status     text not null default 'queued',
  progress   integer not null default 0,
  result     jsonb,
  error      text,
  created_at timestamptz not null default now(),
  source_id  uuid
);
create index if not exists content_jobs_client_idx on public.content_jobs (client_id, created_at desc);
create unique index if not exists content_jobs_source_idx on public.content_jobs (source_id);

-- One brand-voice profile per client.
create table if not exists public.brand_voice_profiles (
  client_id       text primary key,
  voice_tone      text,
  banned_words    text[],
  target_audience text,
  sample_copy     text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

-- One knowledge-base row per client.
create table if not exists public.client_knowledge_base (
  client_id          text primary key,
  case_studies       text,
  brand_voice_samples text,
  unique_facts       text,
  faq                text,
  notes              text,
  brand_guidelines   text,
  updated_at         timestamptz not null default now()
);

-- RLS: enable + standard per-client policies on every new table.
do $$
declare t text;
begin
  foreach t in array array[
    'content_drafts','keyword_research','seo_reports','site_analyses',
    'content_usage_ledger','content_jobs','brand_voice_profiles','client_knowledge_base'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || ' read',   t);
    execute format('drop policy if exists %I on public.%I', t || ' insert', t);
    execute format('drop policy if exists %I on public.%I', t || ' update', t);
    execute format('drop policy if exists %I on public.%I', t || ' delete', t);
    execute format(
      $f$create policy %I on public.%I for select using (public.is_admin() or client_id = public.my_client_id())$f$,
      t || ' read', t);
    execute format(
      $f$create policy %I on public.%I for insert with check (public.is_admin() or client_id = public.my_client_id())$f$,
      t || ' insert', t);
    execute format(
      $f$create policy %I on public.%I for update using (public.is_admin() or client_id = public.my_client_id()) with check (public.is_admin() or client_id = public.my_client_id())$f$,
      t || ' update', t);
    execute format(
      $f$create policy %I on public.%I for delete using (public.is_admin() or client_id = public.my_client_id())$f$,
      t || ' delete', t);
  end loop;
end $$;

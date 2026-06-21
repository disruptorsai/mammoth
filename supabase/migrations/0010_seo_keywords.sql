-- SEO/GEO: per-client keyword watchlist (replaces the mock TRENDING_SIGNALS /
-- SERP_ROWS — real data entered in-app; a rank-tracking source can populate
-- positions later).

create table if not exists public.seo_keywords (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  keyword    text not null,
  target_url text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists seo_keywords_client_idx
  on public.seo_keywords (client_id, created_at desc);

alter table public.seo_keywords enable row level security;

drop policy if exists "seo_keywords read"   on public.seo_keywords;
drop policy if exists "seo_keywords insert" on public.seo_keywords;
drop policy if exists "seo_keywords update" on public.seo_keywords;
drop policy if exists "seo_keywords delete" on public.seo_keywords;
create policy "seo_keywords read"   on public.seo_keywords for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "seo_keywords insert" on public.seo_keywords for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "seo_keywords update" on public.seo_keywords for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "seo_keywords delete" on public.seo_keywords for delete
  using (public.is_admin() or client_id = public.my_client_id());

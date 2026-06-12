-- Paid Advertising: real per-client campaigns (replaces the mock CAMPAIGNS
-- table and hardcoded analytics). Metrics are entered/edited in-app for now and
-- aggregated client-side; ad-platform APIs can populate the same rows later.
-- `revenue` exists so ROAS/CPA are derived, never invented.

create table if not exists public.ad_campaigns (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null,
  name        text not null,
  platform    text not null default 'other'
                check (platform in ('meta', 'google', 'tiktok', 'linkedin', 'youtube', 'other')),
  status      text not null default 'draft'
                check (status in ('draft', 'active', 'learning', 'paused', 'completed')),
  spend       numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  clicks      bigint not null default 0,
  conversions int not null default 0,
  revenue     numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ad_campaigns_client_idx
  on public.ad_campaigns (client_id, created_at desc);

drop trigger if exists ad_campaigns_set_updated_at on public.ad_campaigns;
create trigger ad_campaigns_set_updated_at
  before update on public.ad_campaigns
  for each row execute function public.set_updated_at();

alter table public.ad_campaigns enable row level security;

drop policy if exists "ad_campaigns read"   on public.ad_campaigns;
drop policy if exists "ad_campaigns insert" on public.ad_campaigns;
drop policy if exists "ad_campaigns update" on public.ad_campaigns;
drop policy if exists "ad_campaigns delete" on public.ad_campaigns;
create policy "ad_campaigns read"   on public.ad_campaigns for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "ad_campaigns insert" on public.ad_campaigns for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "ad_campaigns update" on public.ad_campaigns for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "ad_campaigns delete" on public.ad_campaigns for delete
  using (public.is_admin() or client_id = public.my_client_id());

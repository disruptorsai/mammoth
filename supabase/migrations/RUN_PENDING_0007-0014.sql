-- ONE-PASTE CONVENIENCE COPY: pending migrations 0007-0014, in order.
-- Paste this whole file into the Supabase SQL Editor and Run once.

-- ======== 0007_crm.sql ========
-- CRM: real per-client leads pipeline + interaction log (replaces the mock
-- PIPELINE_COLUMNS / INTERACTIONS on the CRM page). Run in the SQL Editor.
-- Reuses set_updated_at() from 0001 and is_admin()/my_client_id() from 0004.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null,
  stage_key   text not null default 'new'
                check (stage_key in ('new', 'qualified', 'proposal', 'contract')),
  position    double precision not null default 0,
  name        text not null,
  company     text not null default '',
  value       numeric(12,2) not null default 0,
  source      text not null default 'manual',
  -- Reserved for Phase 3 GHL sync: the remote opportunity id. Unique per client
  -- so re-syncs upsert instead of duplicating.
  external_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists leads_client_stage_idx
  on public.leads (client_id, stage_key, position);
create unique index if not exists leads_client_external_idx
  on public.leads (client_id, external_id) where external_id is not null;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "leads read"   on public.leads;
drop policy if exists "leads insert" on public.leads;
drop policy if exists "leads update" on public.leads;
drop policy if exists "leads delete" on public.leads;
create policy "leads read"   on public.leads for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "leads insert" on public.leads for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "leads update" on public.leads for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "leads delete" on public.leads for delete
  using (public.is_admin() or client_id = public.my_client_id());

-- Interaction log per lead. client_id denormalized so RLS needs no join.
create table if not exists public.lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  client_id  text not null,
  kind       text not null default 'note'
               check (kind in ('note', 'email', 'call', 'meeting')),
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_client_idx
  on public.lead_activities (client_id, created_at desc);
create index if not exists lead_activities_lead_idx
  on public.lead_activities (lead_id, created_at desc);

alter table public.lead_activities enable row level security;

drop policy if exists "lead_activities read"   on public.lead_activities;
drop policy if exists "lead_activities insert" on public.lead_activities;
drop policy if exists "lead_activities update" on public.lead_activities;
drop policy if exists "lead_activities delete" on public.lead_activities;
create policy "lead_activities read"   on public.lead_activities for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "lead_activities insert" on public.lead_activities for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "lead_activities update" on public.lead_activities for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "lead_activities delete" on public.lead_activities for delete
  using (public.is_admin() or client_id = public.my_client_id());

-- ======== 0008_ad_campaigns.sql ========
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

-- ======== 0009_client_profile_fields.sql ========
-- Client profile/billing fields (replace the hardcoded email/phone/plan on the
-- Subscription page) + the Vista Social group mapping for per-client social data.

alter table public.clients
  add column if not exists billing_email text not null default '',
  add column if not exists phone         text not null default '',
  -- null = no plan selected yet (shown honestly in the UI; Stripe wires later)
  add column if not exists plan          text check (plan in ('growth', 'scale', 'mammoth')),
  -- Vista Social profile-group id this client maps to. Null = fall back to
  -- matching the group name against the client name.
  add column if not exists vista_group_id bigint;

-- ======== 0010_seo_keywords.sql ========
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

-- ======== 0011_usage_events.sql ========
-- Token usage metering for AI generation (powers the Subscription usage card).
-- One row per generation, logged client-side from the API's returned usage for
-- now; authoritative server-side metering moves into the proxy with the Stripe
-- phase. Run in the SQL Editor.

create table if not exists public.usage_events (
  id            uuid primary key default gen_random_uuid(),
  client_id     text not null,
  kind          text not null default 'ad_copy'
                  check (kind in ('ad_copy', 'caption')),
  model         text not null default '',
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists usage_events_client_idx
  on public.usage_events (client_id, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events read"   on public.usage_events;
drop policy if exists "usage_events insert" on public.usage_events;
create policy "usage_events read"   on public.usage_events for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "usage_events insert" on public.usage_events for insert
  with check (public.is_admin() or client_id = public.my_client_id());
-- No update/delete: the ledger is append-only.

-- ======== 0012_ghl.sql ========
-- GoHighLevel integration: map each client to a GHL sub-account (location) and
-- track when their pipeline was last synced. Run in the SQL Editor.

alter table public.clients
  add column if not exists ghl_location_id  text not null default '',
  add column if not exists ghl_last_synced_at timestamptz;

-- ======== 0013_client_secrets.sql ========
-- Per-client integration secrets. Some clients run their OWN GoHighLevel
-- account (not a sub-account under the agency), which needs its own API key.
-- Kept in a separate table with ADMIN-ONLY RLS so client logins can never read
-- it (the clients table is readable by its own client). Run in the SQL Editor.

create table if not exists public.client_secrets (
  client_id   text primary key,
  ghl_api_key text not null default '',
  updated_at  timestamptz not null default now()
);

drop trigger if exists client_secrets_set_updated_at on public.client_secrets;
create trigger client_secrets_set_updated_at
  before update on public.client_secrets
  for each row execute function public.set_updated_at();

alter table public.client_secrets enable row level security;

drop policy if exists "client_secrets admin read"   on public.client_secrets;
drop policy if exists "client_secrets admin insert" on public.client_secrets;
drop policy if exists "client_secrets admin update" on public.client_secrets;
drop policy if exists "client_secrets admin delete" on public.client_secrets;
create policy "client_secrets admin read"   on public.client_secrets for select using (public.is_admin());
create policy "client_secrets admin insert" on public.client_secrets for insert with check (public.is_admin());
create policy "client_secrets admin update" on public.client_secrets for update using (public.is_admin()) with check (public.is_admin());
create policy "client_secrets admin delete" on public.client_secrets for delete using (public.is_admin());

-- ======== 0014_delete_client.sql ========
-- Admin-only client deletion. Removes the client and ALL of their rows in our
-- database (tasks, content, leads, campaigns, keywords, usage, secrets) in one
-- transaction, and unlinks any user profiles pointing at them. This only
-- affects OUR database — it never touches the client's GoHighLevel account or
-- any other external service. Run AFTER 0007-0013.

create or replace function public.delete_client(p_client_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete clients';
  end if;

  delete from public.lead_activities where client_id = p_client_id;
  delete from public.leads           where client_id = p_client_id;
  delete from public.ad_campaigns    where client_id = p_client_id;
  delete from public.seo_keywords    where client_id = p_client_id;
  delete from public.usage_events    where client_id = p_client_id;
  delete from public.client_secrets  where client_id = p_client_id;
  delete from public.content_posts   where client_id = p_client_id;
  delete from public.tasks           where client_id = p_client_id;

  -- Unlink (don't delete) any logins that pointed at this client.
  update public.profiles set client_id = null where client_id = p_client_id;

  delete from public.clients where id = p_client_id;
end;
$$;

grant execute on function public.delete_client(text) to authenticated;


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

-- Move the client roster into the DB so admins can add clients from the app.
-- Run AFTER 0004 (uses is_admin() / my_client_id()). Seeds the existing four
-- clients with their current ids so tasks/content/profiles stay linked.

create table if not exists public.clients (
  id         text primary key,                 -- slug; the canonical client_id everywhere
  name       text not null,
  initials   text not null default '',
  health     int  not null default 75,
  features   jsonb not null default '{"internal":true}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Admins manage all clients; client users may read only their own row.
drop policy if exists "clients read"   on public.clients;
drop policy if exists "clients insert" on public.clients;
drop policy if exists "clients update" on public.clients;
drop policy if exists "clients delete" on public.clients;
create policy "clients read"   on public.clients for select
  using (public.is_admin() or id = public.my_client_id());
create policy "clients insert" on public.clients for insert with check (public.is_admin());
create policy "clients update" on public.clients for update using (public.is_admin()) with check (public.is_admin());
create policy "clients delete" on public.clients for delete using (public.is_admin());

-- Seed existing clients (idempotent).
insert into public.clients (id, name, initials, health, features) values
  ('atom-fitness',    'Pinnacle Dental',  'PD', 82, '{"internal":true,"seo":true,"social":true,"ads":true,"crm":true}'::jsonb),
  ('precision-solar', 'Precision Solar',  'PS', 64, '{"internal":true,"seo":true,"social":false,"ads":true,"crm":true}'::jsonb),
  ('vanguard-media',  'Vanguard Media',   'VM', 91, '{"internal":true,"seo":true,"social":true,"ads":false,"crm":false}'::jsonb),
  ('elum-collective', 'Northside Realty', 'NR', 47, '{"internal":true,"seo":false,"social":true,"ads":true,"crm":true}'::jsonb)
on conflict (id) do nothing;

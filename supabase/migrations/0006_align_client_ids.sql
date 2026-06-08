-- Align client ids with their names (atom-fitness -> pinnacle-dental,
-- elum-collective -> northside-realty) WITHOUT losing data.
-- Self-contained: safe to run whether or not 0005 was applied. Run in the SQL Editor.

-- 0) Make sure the clients table + policies exist (no-ops if 0005 already ran).
create table if not exists public.clients (
  id         text primary key,
  name       text not null,
  initials   text not null default '',
  health     int  not null default 75,
  features   jsonb not null default '{"internal":true}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
drop policy if exists "clients read"   on public.clients;
drop policy if exists "clients insert" on public.clients;
drop policy if exists "clients update" on public.clients;
drop policy if exists "clients delete" on public.clients;
create policy "clients read"   on public.clients for select using (public.is_admin() or id = public.my_client_id());
create policy "clients insert" on public.clients for insert with check (public.is_admin());
create policy "clients update" on public.clients for update using (public.is_admin()) with check (public.is_admin());
create policy "clients delete" on public.clients for delete using (public.is_admin());

-- 1) Ensure the clean-id client rows exist (also covers "0005 was never run").
insert into public.clients (id, name, initials, health, features) values
  ('pinnacle-dental',  'Pinnacle Dental',  'PD', 82, '{"internal":true,"seo":true,"social":true,"ads":true,"crm":true}'::jsonb),
  ('precision-solar',  'Precision Solar',  'PS', 64, '{"internal":true,"seo":true,"social":false,"ads":true,"crm":true}'::jsonb),
  ('vanguard-media',   'Vanguard Media',   'VM', 91, '{"internal":true,"seo":true,"social":true,"ads":false,"crm":false}'::jsonb),
  ('northside-realty', 'Northside Realty', 'NR', 47, '{"internal":true,"seo":false,"social":true,"ads":true,"crm":true}'::jsonb)
on conflict (id) do nothing;

-- 2) Move any rows created under the old ids to the new ones.
update public.tasks         set client_id = 'pinnacle-dental'  where client_id = 'atom-fitness';
update public.tasks         set client_id = 'northside-realty' where client_id = 'elum-collective';
update public.content_posts set client_id = 'pinnacle-dental'  where client_id = 'atom-fitness';
update public.content_posts set client_id = 'northside-realty' where client_id = 'elum-collective';
update public.profiles      set client_id = 'pinnacle-dental'  where client_id = 'atom-fitness';
update public.profiles      set client_id = 'northside-realty' where client_id = 'elum-collective';

-- 3) Drop the old-id client rows (their data has been moved above).
delete from public.clients where id in ('atom-fitness', 'elum-collective');

-- Optional: if tasks/posts got saved under an EMPTY client_id (created before the
-- roster loaded), claim them for a client by uncommenting one of these:
-- update public.tasks         set client_id = 'pinnacle-dental' where client_id = '';
-- update public.content_posts set client_id = 'pinnacle-dental' where client_id = '';

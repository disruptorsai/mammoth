-- Move the client roster into the DB so admins can add clients from the app.
-- Run AFTER 0004 (uses is_admin() / my_client_id()). Starts EMPTY — add clients
-- in-app via the "+ New Client" form in the sidebar client switcher.

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

-- No seed: start with an empty roster and add clients from the app.

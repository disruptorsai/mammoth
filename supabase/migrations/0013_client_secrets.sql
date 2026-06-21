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

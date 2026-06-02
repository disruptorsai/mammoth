-- Authentication + per-client access (admin + client roles, admin-created only).
-- Run in the Supabase SQL Editor. AFTER this runs the app requires login, and
-- tasks/content_posts are restricted per-client (anon access is removed).
--
-- Bootstrap your first admin (after creating the user under
-- Authentication -> Users -> Add user):
--   update public.profiles set role = 'admin' where email = 'you@disruptorsmedia.com';
-- For a client user, set their client_id to one of the ids in src/data/clients.js:
--   update public.profiles set role='client', client_id='atom-fitness' where email='client@example.com';

-- 1) Profile per auth user: role + which client they belong to.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'client' check (role in ('admin', 'client')),
  client_id  text,                              -- matches src/data/clients.js ids; null for admins
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2) SECURITY DEFINER helpers — read role/client without tripping profiles RLS
--    (a policy that queried profiles directly would recurse).
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.my_client_id()
returns text language sql security definer stable set search_path = public as $$
  select client_id from public.profiles where id = auth.uid()
$$;

-- 3) Auto-create a profile row when a user is added (default role 'client').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (id, email, role)
  select id, email, 'client' from auth.users
  on conflict (id) do nothing;

-- 4) profiles policies: read your own (admins read all); admins can update.
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- 5) Replace anon policies on tasks + content_posts with per-client auth.
do $$
declare t text;
begin
  foreach t in array array['tasks', 'content_posts'] loop
    execute format('drop policy if exists %I on public.%I', t || ' anon read', t);
    execute format('drop policy if exists %I on public.%I', t || ' anon write', t);
    execute format('drop policy if exists %I on public.%I', t || ' anon update', t);
    execute format('drop policy if exists %I on public.%I', t || ' anon delete', t);
  end loop;
end $$;

-- tasks
create policy "tasks read"   on public.tasks for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "tasks insert" on public.tasks for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "tasks update" on public.tasks for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "tasks delete" on public.tasks for delete
  using (public.is_admin() or client_id = public.my_client_id());

-- content_posts
create policy "content read"   on public.content_posts for select
  using (public.is_admin() or client_id = public.my_client_id());
create policy "content insert" on public.content_posts for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "content update" on public.content_posts for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "content delete" on public.content_posts for delete
  using (public.is_admin() or client_id = public.my_client_id());

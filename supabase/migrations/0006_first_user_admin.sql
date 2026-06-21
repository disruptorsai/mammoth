-- First account becomes admin automatically (so a fresh install is never stuck on
-- the "no workspace" screen). Run in the SQL Editor on an existing DB.

-- 1) Update the signup trigger: first user -> admin, everyone after -> client.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (select 1 from public.profiles where role = 'admin') then 'client' else 'admin' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Promote the existing account(s): if no admin yet, make the earliest user admin.
update public.profiles set role = 'admin'
where not exists (select 1 from public.profiles where role = 'admin')
  and id = (select id from public.profiles order by created_at asc limit 1);

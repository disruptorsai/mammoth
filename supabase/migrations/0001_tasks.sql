-- Mission Control — task board schema.
-- Run this in the Supabase dashboard (SQL Editor) on your project, or via the CLI.
-- No auth yet: tasks are public (anon key). Lock down with RLS/auth later.

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  -- Matches the client ids in src/data/clients.js (e.g. 'atom-fitness'). Each
  -- client has its own board; the app filters by this.
  client_id   text        not null,
  -- Which column the card lives in.
  column_key  text        not null default 'todo'
                check (column_key in ('todo', 'in_progress', 'review')),
  -- Ordering within a column. Lower = higher up. Fractional values let us insert
  -- between two cards without renumbering the whole column.
  position    double precision not null default 0,
  title       text        not null,
  description text        not null default '',
  tag         text        not null default '',
  due_label   text        not null default '',
  -- Optional 0–100 progress bar (used by "in progress" cards).
  progress    int         check (progress is null or (progress >= 0 and progress <= 100)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_client_column_idx
  on public.tasks (client_id, column_key, position);

-- Keep updated_at fresh on every write.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- No-auth access for now. RLS ON but with permissive policies so the anon key
-- can read/write; replace these with auth-scoped policies when you add login.
alter table public.tasks enable row level security;

drop policy if exists "tasks anon read"   on public.tasks;
drop policy if exists "tasks anon write"  on public.tasks;
drop policy if exists "tasks anon update" on public.tasks;
drop policy if exists "tasks anon delete" on public.tasks;

create policy "tasks anon read"   on public.tasks for select using (true);
create policy "tasks anon write"  on public.tasks for insert with check (true);
create policy "tasks anon update" on public.tasks for update using (true) with check (true);
create policy "tasks anon delete" on public.tasks for delete using (true);

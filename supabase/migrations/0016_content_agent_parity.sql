-- Tables + columns to reach full Content Agent parity inside Mission Control.
-- Additive and reversible; client_id is the Mammoth slug (text); RLS mirrors the
-- app pattern (admins all, client users their own) via is_admin()/my_client_id().
-- Run in the Supabase SQL Editor.

-- Prompt Studio: versioned generation prompts per content type.
-- client_id NULL = a global default template shared by all clients.
create table if not exists public.prompt_templates (
  id           uuid primary key default gen_random_uuid(),
  client_id    text,
  content_type text not null,
  template     text not null,
  version      integer not null default 1,
  is_active    boolean not null default false,
  is_active_ab boolean not null default false,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists prompt_templates_client_idx on public.prompt_templates (client_id, content_type, version desc);

-- Draft approval trail.
create table if not exists public.approvals (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  draft_id   uuid not null references public.content_drafts(id) on delete cascade,
  user_id    uuid references auth.users(id),
  action     text not null check (action in ('approve','reject','request_revision','resubmit')),
  note       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists approvals_draft_idx on public.approvals (draft_id, created_at desc);

-- AI Content Agent: persisted persona chats.
create table if not exists public.agent_conversations (
  id         uuid primary key default gen_random_uuid(),
  client_id  text not null,
  agent_name text not null,
  title      text not null default 'Untitled',
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_conversations_client_idx on public.agent_conversations (client_id, updated_at desc);

-- AI Images: standalone generated images (file in Supabase Storage).
create table if not exists public.client_images (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null,
  prompt       text not null,
  storage_path text not null default '',
  cost_cents   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists client_images_client_idx on public.client_images (client_id, created_at desc);

-- BYOK API keys (admin-only). Stored as text; treat as sensitive.
create table if not exists public.api_keys (
  client_id       text not null,
  provider        text not null,
  secret          text not null default '',
  last_four       text not null default '',
  last_rotated_at timestamptz not null default now(),
  primary key (client_id, provider)
);

-- Settings columns on clients (additive).
alter table public.clients add column if not exists wordpress_url text not null default '';
alter table public.clients add column if not exists auto_publish_on_approval boolean not null default false;
alter table public.clients add column if not exists competitor_domains text[] not null default '{}';
alter table public.clients add column if not exists token_allowance integer not null default 0;
alter table public.clients add column if not exists top_up_tokens integer not null default 0;

-- RLS: standard per-client policies for the client_id-scoped tables.
do $$
declare t text;
begin
  foreach t in array array['approvals','agent_conversations','client_images'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || ' read',   t);
    execute format('drop policy if exists %I on public.%I', t || ' insert', t);
    execute format('drop policy if exists %I on public.%I', t || ' update', t);
    execute format('drop policy if exists %I on public.%I', t || ' delete', t);
    execute format($f$create policy %I on public.%I for select using (public.is_admin() or client_id = public.my_client_id())$f$, t || ' read', t);
    execute format($f$create policy %I on public.%I for insert with check (public.is_admin() or client_id = public.my_client_id())$f$, t || ' insert', t);
    execute format($f$create policy %I on public.%I for update using (public.is_admin() or client_id = public.my_client_id()) with check (public.is_admin() or client_id = public.my_client_id())$f$, t || ' update', t);
    execute format($f$create policy %I on public.%I for delete using (public.is_admin() or client_id = public.my_client_id())$f$, t || ' delete', t);
  end loop;
end $$;

-- prompt_templates: readable to the owning client + globals; writable by admins
-- or the owning client user.
alter table public.prompt_templates enable row level security;
drop policy if exists "prompt_templates read"   on public.prompt_templates;
drop policy if exists "prompt_templates insert" on public.prompt_templates;
drop policy if exists "prompt_templates update" on public.prompt_templates;
drop policy if exists "prompt_templates delete" on public.prompt_templates;
create policy "prompt_templates read"   on public.prompt_templates for select
  using (client_id is null or public.is_admin() or client_id = public.my_client_id());
create policy "prompt_templates insert" on public.prompt_templates for insert
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "prompt_templates update" on public.prompt_templates for update
  using (public.is_admin() or client_id = public.my_client_id())
  with check (public.is_admin() or client_id = public.my_client_id());
create policy "prompt_templates delete" on public.prompt_templates for delete
  using (public.is_admin() or client_id = public.my_client_id());

-- api_keys: admin-only (sensitive).
alter table public.api_keys enable row level security;
drop policy if exists "api_keys read"   on public.api_keys;
drop policy if exists "api_keys write"  on public.api_keys;
create policy "api_keys read"  on public.api_keys for select using (public.is_admin());
create policy "api_keys write" on public.api_keys for all    using (public.is_admin()) with check (public.is_admin());

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

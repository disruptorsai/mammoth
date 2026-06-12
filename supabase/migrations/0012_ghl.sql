-- GoHighLevel integration: map each client to a GHL sub-account (location) and
-- track when their pipeline was last synced. Run in the SQL Editor.

alter table public.clients
  add column if not exists ghl_location_id  text not null default '',
  add column if not exists ghl_last_synced_at timestamptz;

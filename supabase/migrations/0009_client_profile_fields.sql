-- Client profile/billing fields (replace the hardcoded email/phone/plan on the
-- Subscription page) + the Vista Social group mapping for per-client social data.

alter table public.clients
  add column if not exists billing_email text not null default '',
  add column if not exists phone         text not null default '',
  -- null = no plan selected yet (shown honestly in the UI; Stripe wires later)
  add column if not exists plan          text check (plan in ('growth', 'scale', 'mammoth')),
  -- Vista Social profile-group id this client maps to. Null = fall back to
  -- matching the group name against the client name.
  add column if not exists vista_group_id bigint;

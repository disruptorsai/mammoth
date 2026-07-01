-- Auto-blog scheduler — Supabase pg_cron + pg_net fire the Tue/Thu job by
-- invoking the `auto-blog` Edge Function (150s runtime — no Vercel timeout).
-- Run this in the Supabase SQL editor AFTER 0018 + 0019, and AFTER deploying the
-- Edge Function:  supabase functions deploy auto-blog --no-verify-jwt
--
-- >>> BEFORE RUNNING, replace the placeholder:
--     <YOUR_CRON_SECRET>  must exactly match the CRON_SECRET secret set on the
--                         Edge Function (supabase secrets set CRON_SECRET=...)
--
-- The function is gated by blog_automation.enabled, so scheduling does NOT
-- publish anything until you flip the toggle ON in the app.
--
-- NOTE: --no-verify-jwt lets pg_cron call the function without a Supabase JWT;
-- auth is handled by our own CRON_SECRET (x-cron-secret header) instead.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin
  perform cron.unschedule('disruptors-autoblog');
exception when others then null; end $$;

-- Tuesday & Thursday at 15:00 UTC (~9am Mountain). Change the time if you like.
select cron.schedule(
  'disruptors-autoblog',
  '0 15 * * 2,4',
  $$
  select net.http_post(
    url     := 'https://mmqrpgshlmorvlmlpiui.supabase.co/functions/v1/auto-blog',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<YOUR_CRON_SECRET>'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

-- Handy checks:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
-- Pause without deleting:  select cron.unschedule('disruptors-autoblog');

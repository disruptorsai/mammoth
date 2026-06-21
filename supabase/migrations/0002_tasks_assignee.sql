-- Add an assignee to tasks (June 02 review: Bryan wants an Assignee field).
-- Run this in the Supabase SQL Editor. Simple free-text name for now; a real
-- multi-user picker (FK to a users table) can replace it later.

alter table public.tasks
  add column if not exists assignee text not null default '';

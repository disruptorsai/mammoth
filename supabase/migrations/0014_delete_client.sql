-- Admin-only client deletion. Removes the client and ALL of their rows in our
-- database (tasks, content, leads, campaigns, keywords, usage, secrets) in one
-- transaction, and unlinks any user profiles pointing at them. This only
-- affects OUR database — it never touches the client's GoHighLevel account or
-- any other external service. Run AFTER 0007-0013.

create or replace function public.delete_client(p_client_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete clients';
  end if;

  delete from public.lead_activities where client_id = p_client_id;
  delete from public.leads           where client_id = p_client_id;
  delete from public.ad_campaigns    where client_id = p_client_id;
  delete from public.seo_keywords    where client_id = p_client_id;
  delete from public.usage_events    where client_id = p_client_id;
  delete from public.client_secrets  where client_id = p_client_id;
  delete from public.content_posts   where client_id = p_client_id;
  delete from public.tasks           where client_id = p_client_id;

  -- Unlink (don't delete) any logins that pointed at this client.
  update public.profiles set client_id = null where client_id = p_client_id;

  delete from public.clients where id = p_client_id;
end;
$$;

grant execute on function public.delete_client(text) to authenticated;

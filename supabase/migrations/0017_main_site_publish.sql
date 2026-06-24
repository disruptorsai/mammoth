-- Main website publishing: track where a draft was published on the public
-- marketing site (disruptorsmedia.com `posts` table). Kept separate from the
-- existing `wp_post_url` (client WordPress) so both publish targets coexist.
--
-- `main_site_slug` is the stable identity of the published post: we reuse it on
-- re-publish so editing a draft's title does NOT orphan the live URL.
alter table public.content_drafts
  add column if not exists main_site_url  text,
  add column if not exists main_site_slug text;

comment on column public.content_drafts.main_site_url  is 'Live URL of this draft on the public marketing site (disruptorsmedia.com). Set by api/publish-to-main-site.';
comment on column public.content_drafts.main_site_slug is 'Stable slug of the published post on the main site; reused on re-publish to keep the URL stable across title edits.';

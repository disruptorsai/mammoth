// Publish an approved Mammoth draft to the PUBLIC marketing site
// (disruptorsmedia.com). The main site is a SEPARATE Supabase project, so this
// writes into ITS public.posts table with the main-site SERVICE-ROLE key
// (server-side only). A row is live the moment it exists with is_published=true
// and a unique slug — nothing else on the main site needs to run.
//
// This is an ADDITIONAL publish target; it does not touch the WordPress path
// (wp_post_url / auto_publish_on_approval). Scoped to the 'disruptors-media'
// client only (override with MAIN_SITE_CLIENT_ID).
//
// Env: MAIN_SITE_SUPABASE_URL, MAIN_SITE_SUPABASE_SERVICE_ROLE_KEY,
//      VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Mammoth DB, for read +
//      status writeback). Optional: MAIN_SITE_CLIENT_ID, MAIN_SITE_PUBLIC_URL.
import { createClient } from '@supabase/supabase-js'
import { makeServiceClient } from './_seoGenerateCore.js'

const DEFAULT_CLIENT_ID = 'disruptors-media'
const DEFAULT_PUBLIC_URL = 'https://disruptorsmedia.com'

export function makeMainSiteClient(env) {
  const url = env.MAIN_SITE_SUPABASE_URL
  const key = env.MAIN_SITE_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key)
    throw new Error('Main-site publishing is not configured (MAIN_SITE_SUPABASE_URL / MAIN_SITE_SUPABASE_SERVICE_ROLE_KEY).')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// URL-safe, lowercase, hyphenated, de-accented; capped so it fits the column.
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

// First ~160 chars of plain text (markdown/HTML stripped) for listings + SEO.
function buildExcerpt(content) {
  const plain = String(content || '')
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/<[^>]*>/g, ' ') // html tags
    .replace(/[#*_>`~|]+/g, ' ') // md punctuation
    .replace(/\s+/g, ' ')
    .trim()
  return plain.slice(0, 160).trim() + (plain.length > 160 ? '…' : '')
}

// featured_image must be a fully-qualified PUBLIC URL (the hero <img src> loads
// it directly). Only pass it through when the draft already holds a public URL;
// a private storage path would render a broken image, so we omit it instead.
function featuredImageUrl(draft) {
  const p = draft.image_storage_path
  if (p && /^https?:\/\//i.test(p)) return p
  return null
}

export async function publishDraftToMainSite({ env, draftId }) {
  if (!draftId) throw new Error('draftId is required')
  const allowedClient = env.MAIN_SITE_CLIENT_ID || DEFAULT_CLIENT_ID
  const publicBase = (env.MAIN_SITE_PUBLIC_URL || DEFAULT_PUBLIC_URL).replace(/\/$/, '')

  const mc = makeServiceClient(env) // Mammoth DB (read draft + write status back)
  const site = makeMainSiteClient(env) // main-site DB (write the post)

  // select * so we tolerate the optional main_site_* columns (migration 0017)
  // whether or not they've been applied yet.
  const { data: draft, error: dErr } = await mc.from('content_drafts').select('*').eq('id', draftId).single()
  if (dErr) throw dErr
  if (!draft) throw new Error('Draft not found.')

  if (draft.client_id !== allowedClient)
    throw new Error(`Only "${allowedClient}" drafts can be published to the main website.`)
  if (!['approved', 'published'].includes(draft.status))
    throw new Error(`Draft must be approved first (current status: ${draft.status}).`)

  const content = (draft.humanized || draft.original || '').trim()
  if (!content) throw new Error('Draft has no content to publish.')

  const words = content.split(/\s+/).filter(Boolean).length
  const excerpt = buildExcerpt(content)
  // Reuse the slug from a prior publish so editing the title doesn't orphan the
  // live URL; otherwise derive it from the topic.
  const slug = draft.main_site_slug || slugify(draft.topic)
  if (!slug) throw new Error('Could not derive a slug from the draft topic.')
  const nowIso = new Date().toISOString()

  const row = {
    title: draft.topic,
    slug,
    content, // Markdown (main site renders react-markdown + remark-gfm + rehype-raw)
    excerpt,
    content_type: 'blog',
    featured_image: featuredImageUrl(draft),
    category: 'AI Marketing',
    read_time_minutes: Math.max(1, Math.ceil(words / 200)),
    is_published: true, // live immediately
    published_at: nowIso,
    seo_title: draft.topic,
    seo_description: excerpt,
    approval_status: 'approved',
    auto_generated: true,
    generation_metadata: {
      source: 'mammoth',
      mammoth_draft_id: draft.id,
      model: draft.model || null,
      word_count: words,
      published_at: nowIso,
    },
    updated_at: nowIso,
  }

  const saved = await upsertPost(site, row)
  const liveUrl = `${publicBase}/blog-detail?slug=${saved.slug}`

  // Write the result back to the Mammoth draft. Best-effort on the new columns
  // (migration 0017): if they aren't applied yet, fall back to status-only so
  // publishing still succeeds — slug-stability just won't persist until then.
  const writeback = { status: 'published', main_site_url: liveUrl, main_site_slug: saved.slug, updated_at: nowIso }
  let wb = await mc.from('content_drafts').update(writeback).eq('id', draftId)
  if (wb.error) {
    wb = await mc.from('content_drafts').update({ status: 'published', updated_at: nowIso }).eq('id', draftId)
    if (wb.error) throw wb.error
  }

  return { id: saved.id, slug: saved.slug, url: liveUrl }
}

// Upsert the post; if the target rejects an optional column (e.g. an
// approval_status CHECK constraint), retry once with only the core fields.
async function upsertPost(site, row) {
  let res = await site.from('posts').upsert(row, { onConflict: 'slug' }).select('id, slug').single()
  if (res.error && /approval_status|generation_metadata|auto_generated|content_type|featured_image/i.test(res.error.message)) {
    const { approval_status, auto_generated, generation_metadata, featured_image, content_type, ...core } = row
    res = await site.from('posts').upsert(core, { onConflict: 'slug' }).select('id, slug').single()
  }
  if (res.error) throw new Error(`Main-site publish failed: ${res.error.message}`)
  return res.data
}

// Auto-blog core: the scheduled (Tue/Thu) job that turns the next queued topic
// into a live post on the main website. Reuses the exact same Node logic as the
// manual in-app flow (generateDraft + publishDraftToMainSite + image), so an
// auto-published post is identical in quality to a hand-reviewed one.
//
// Runs off a `blog_queue` (curated topics) gated by a `blog_automation` toggle.
// Scoped to the main-site client (disruptors-media). Triggered by Supabase
// pg_cron -> /api/cron-blog. Text + hero image are generated in PARALLEL to stay
// well under the 60s function budget (Vercel Hobby).
//
// Env: ANTHROPIC_API_KEY, OPENAI_API_KEY, VITE_SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY, MAIN_SITE_SUPABASE_URL,
//      MAIN_SITE_SUPABASE_SERVICE_ROLE_KEY. Optional: MAIN_SITE_CLIENT_ID.
import { makeServiceClient, generateDraft } from './_seoGenerateCore.js'
import { publishDraftToMainSite, makeMainSiteClient, generateAndUploadImage } from './_publishMainSiteCore.js'

const DEFAULT_CLIENT_ID = 'disruptors-media'
const LOW_QUEUE_THRESHOLD = 4

// Turn a queue row into keyword-targeting guidance for the generator (kept out
// of the stored title so the post title stays clean).
function keywordGuidance(topic) {
  const secondaries = Array.isArray(topic.secondary_keywords) ? topic.secondary_keywords.filter(Boolean) : []
  const parts = [`Write a blog post of at least 1,200 words optimized for the primary keyword "${topic.primary_keyword}".`]
  if (secondaries.length) parts.push(`Naturally incorporate these related keywords where they genuinely fit: ${secondaries.join(', ')}.`)
  parts.push('Use the primary keyword in the opening and in at least one H2. Do not keyword-stuff.')
  return parts.join(' ')
}

export async function runAutoBlog({ env, force = false } = {}) {
  const clientId = env.MAIN_SITE_CLIENT_ID || DEFAULT_CLIENT_ID
  const db = makeServiceClient(env)

  // Gate: the DisruptorsMedia-only toggle. `force` (manual "run now") bypasses it.
  const { data: settings } = await db.from('blog_automation').select('*').eq('client_id', clientId).maybeSingle()
  if (!force && !settings?.enabled) return { skipped: true, reason: 'automation_disabled' }

  // Self-heal: if a prior run was killed mid-generation (e.g. a function
  // timeout), release rows stuck in 'generating' for >15 min back to the queue
  // so they retry instead of wedging forever.
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  await db
    .from('blog_queue')
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('status', 'generating')
    .lt('updated_at', staleBefore)

  const perRun = Math.max(1, settings?.posts_per_run || 1)
  const results = []
  for (let i = 0; i < perRun; i++) {
    const one = await publishNextQueued({ env, db, clientId })
    results.push(one)
    if (one.queueEmpty) break
  }
  await db.from('blog_automation').update({ last_run_at: new Date().toISOString() }).eq('client_id', clientId)
  return { skipped: false, clientId, results }
}

async function publishNextQueued({ env, db, clientId }) {
  // Claim the next queued topic (highest priority first). Flip to 'generating'
  // immediately so a retry/overlap can't grab the same row.
  const { data: topic } = await db
    .from('blog_queue')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!topic) return { queueEmpty: true }

  await db.from('blog_queue').update({ status: 'generating', updated_at: new Date().toISOString() }).eq('id', topic.id)

  try {
    const site = makeMainSiteClient(env)
    const imagePrompt =
      `Create a modern, professional blog header image representing: ${topic.title}. ` +
      'Clean, modern aesthetic aligned with AI, marketing, and technology. No text or words in the image.'

    // Text + hero image concurrently — the slow parts run in parallel (~25s).
    const [gen, imageUrl] = await Promise.all([
      generateDraft({
        env,
        clientId,
        contentType: 'blog_post',
        topic: topic.title, // clean title -> becomes the post title
        useKnowledgeBase: true,
        extraInstructions: keywordGuidance(topic),
      }),
      generateAndUploadImage({ env, site, prompt: imagePrompt, path: `generated/auto-${topic.id}.png` }).catch(() => null),
    ])

    // Attach the image (publish reuses a public URL already on the draft) and
    // approve so the publish guard passes.
    const patch = { status: 'approved', updated_at: new Date().toISOString() }
    if (imageUrl) patch.image_storage_path = imageUrl
    await db.from('content_drafts').update(patch).eq('id', gen.draftId)

    const pub = await publishDraftToMainSite({
      env,
      draftId: gen.draftId,
      primaryKeyword: topic.primary_keyword,
      secondaryKeywords: Array.isArray(topic.secondary_keywords) ? topic.secondary_keywords : [],
    })

    await db
      .from('blog_queue')
      .update({ status: 'published', draft_id: gen.draftId, post_slug: pub.slug, post_url: pub.url, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', topic.id)

    const { count } = await db
      .from('blog_queue')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'queued')
    const remaining = count ?? 0

    return { queueEmpty: false, title: topic.title, draftId: gen.draftId, url: pub.url, remaining, lowQueue: remaining <= LOW_QUEUE_THRESHOLD }
  } catch (e) {
    // Release the row back to the queue so the next run retries it.
    await db.from('blog_queue').update({ status: 'queued', last_error: String(e?.message || e), updated_at: new Date().toISOString() }).eq('id', topic.id)
    throw e
  }
}

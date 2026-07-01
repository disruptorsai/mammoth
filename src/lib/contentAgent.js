// SEO/GEO data access. All data lives in Mission Control's OWN Supabase project,
// read through the shared `supabase` client keyed by the Mammoth client slug —
// exactly like seoKeywords.js / tasks.js. Writes (generation) go through the
// /api/seo-* endpoints. Nothing here touches any other project's database.
import { supabase, isSupabaseConfigured } from './supabase'

const since30d = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
const rows = (r) => r.data ?? []

async function one(promise) {
  const { data, error } = await promise
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows for .single()
  return data ?? null
}

// --- reads (Mission Control DB, by client slug) -----------------------------

export async function fetchDashboard(clientId) {
  if (!isSupabaseConfigured) return null
  const since = since30d()
  const [usage, drafts, seoReports, jobs, keywords, client, siteAnalysis, knowledgeBase, brandVoice] =
    await Promise.all([
      supabase.from('content_usage_ledger').select('event,cost_cents,tokens,ts').eq('client_id', clientId).gte('ts', since),
      supabase.from('content_drafts').select('status,cost_cents,updated_at').eq('client_id', clientId).gte('updated_at', since),
      supabase.from('seo_reports').select('id,domain,generated_at,report_json').eq('client_id', clientId).order('generated_at', { ascending: false }).limit(10),
      supabase.from('content_jobs').select('id,kind,status,created_at').eq('client_id', clientId).gte('created_at', since).order('created_at', { ascending: false }).limit(20),
      supabase.from('keyword_research').select('keyword,volume,difficulty,leverage_score').eq('client_id', clientId).order('leverage_score', { ascending: false, nullsFirst: false }).limit(10),
      supabase.from('clients').select('name').eq('id', clientId).single(),
      supabase.from('site_analyses').select('id,domain,recommendations,generated_at').eq('client_id', clientId).eq('status', 'succeeded').order('generated_at', { ascending: false }).limit(1),
      supabase.from('client_knowledge_base').select('*').eq('client_id', clientId).maybeSingle(),
      supabase.from('brand_voice_profiles').select('voice_tone,target_audience,sample_copy').eq('client_id', clientId).maybeSingle(),
    ])
  for (const r of [usage, drafts, seoReports, jobs, keywords]) if (r.error) throw r.error
  return {
    client: client.data ?? null,
    usage: rows(usage),
    drafts: rows(drafts),
    seoReports: rows(seoReports),
    jobs: rows(jobs),
    keywords: rows(keywords),
    siteAnalysis: rows(siteAnalysis)[0] ?? null,
    knowledgeBase: knowledgeBase.data ?? null,
    brandVoice: brandVoice.data ?? null,
  }
}

export async function fetchDrafts(clientId, status = 'all') {
  if (!isSupabaseConfigured) return { rows: [], counts: {} }
  let q = supabase
    .from('content_drafts')
    .select('id,content_type,topic,status,updated_at,cost_cents,image_storage_path,wp_post_url,scheduled_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (status && status !== 'all') q = q.eq('status', status)
  const [list, all] = await Promise.all([
    q,
    supabase.from('content_drafts').select('status').eq('client_id', clientId),
  ])
  if (list.error) throw list.error
  if (all.error) throw all.error
  const counts = { all: rows(all).length }
  for (const r of rows(all)) counts[r.status] = (counts[r.status] || 0) + 1
  return { rows: rows(list), counts }
}

export async function fetchCaKeywords(clientId) {
  if (!isSupabaseConfigured) return { rows: [] }
  const { data, error } = await supabase
    .from('keyword_research')
    .select('id,keyword,volume,difficulty,intent,leverage_score,trend,ttl_at')
    .eq('client_id', clientId)
    .order('leverage_score', { ascending: false, nullsFirst: false })
    .limit(500)
  if (error) throw error
  return { rows: data ?? [] }
}

export async function fetchSeoReports(clientId) {
  if (!isSupabaseConfigured) return { website: '', reports: [] }
  const { data, error } = await supabase
    .from('seo_reports')
    .select('id,domain,generated_at,pdf_storage_path,usage_billed')
    .eq('client_id', clientId)
    .order('generated_at', { ascending: false })
    .limit(50)
  if (error) throw error
  const reports = data ?? []
  return { website: reports[0]?.domain ?? '', reports }
}

// Full single report (with report_json) for the detail view.
export async function fetchSeoReport(id) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('seo_reports')
    .select('id,domain,generated_at,report_json,usage_billed')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchSiteAnalysis(clientId) {
  if (!isSupabaseConfigured) return { website: '', analysis: null }
  const analysis = await one(
    supabase
      .from('site_analyses')
      .select('id,domain,status,current_rankings,recommendations,error,generated_at,finished_at')
      .eq('client_id', clientId)
      .in('status', ['succeeded', 'failed'])
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  )
  return { website: analysis?.domain ?? '', analysis }
}

// --- Knowledge Base + Brand Voice (user-edited; client-side writes via RLS) ---

export async function fetchKnowledgeBase(clientId) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('client_knowledge_base')
    .select('case_studies,brand_voice_samples,brand_guidelines,unique_facts,faq,notes,updated_at')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveKnowledgeBase(clientId, fields) {
  const { error } = await supabase
    .from('client_knowledge_base')
    .upsert({ client_id: clientId, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) throw error
}

export async function fetchBrandVoice(clientId) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('brand_voice_profiles')
    .select('voice_tone,target_audience,banned_words,sample_copy')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveBrandVoice(clientId, fields) {
  const { error } = await supabase
    .from('brand_voice_profiles')
    .upsert({ client_id: clientId, ...fields }, { onConflict: 'client_id' })
  if (error) throw error
}

// --- Draft editor (single draft: read content, edit, change status, schedule) -

export async function fetchDraft(id) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('content_drafts')
    .select('id,client_id,content_type,topic,original,humanized,status,model,cost_cents,scheduled_at,wp_post_url,image_storage_path,created_at,updated_at')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function saveDraftHumanized(id, humanized) {
  const { error } = await supabase
    .from('content_drafts')
    .update({ humanized, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function setDraftStatus(id, status, extra = {}) {
  const { error } = await supabase
    .from('content_drafts')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id)
  if (error) throw error
}

// Approval trail — best-effort (table arrives with migration 0016; degrade
// gracefully until then so the editor still works).
export async function addApproval(clientId, draftId, action, note = '') {
  try {
    const { data: auth } = await supabase.auth.getUser()
    await supabase.from('approvals').insert({ client_id: clientId, draft_id: draftId, action, note, user_id: auth?.user?.id ?? null })
  } catch {
    /* approvals table not present yet — ignore */
  }
}

export async function fetchApprovals(draftId) {
  try {
    const { data } = await supabase
      .from('approvals')
      .select('id,action,note,created_at')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

// --- Blog Studio: import a file's text as a draft -----------------------------

export async function importDraft(clientId, { topic, contentType = 'blog_post', body }) {
  const { data, error } = await supabase
    .from('content_drafts')
    .insert({
      client_id: clientId,
      content_type: contentType,
      topic,
      original: body,
      humanized: body,
      status: 'pending_approval',
      model: 'imported',
      cost_cents: 0,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

// --- Prompt Studio (prompt_templates CRUD, client-side via RLS) -------------

export async function fetchPromptTemplates(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('id,client_id,content_type,template,version,is_active,is_active_ab,notes,created_at')
    .or(`client_id.is.null,client_id.eq.${clientId}`)
    .order('content_type', { ascending: true })
    .order('version', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createPromptTemplate(clientId, { content_type, template, notes = '', activate = false }) {
  // Next version for this client's content type.
  const { data: existing } = await supabase
    .from('prompt_templates')
    .select('version')
    .eq('client_id', clientId)
    .eq('content_type', content_type)
    .order('version', { ascending: false })
    .limit(1)
  const version = (existing?.[0]?.version ?? 0) + 1
  if (activate) {
    await supabase.from('prompt_templates').update({ is_active: false }).eq('client_id', clientId).eq('content_type', content_type)
  }
  const { data, error } = await supabase
    .from('prompt_templates')
    .insert({ client_id: clientId, content_type, template, notes, version, is_active: activate })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function activatePromptTemplate(clientId, id, content_type) {
  await supabase.from('prompt_templates').update({ is_active: false }).eq('client_id', clientId).eq('content_type', content_type)
  const { error } = await supabase.from('prompt_templates').update({ is_active: true }).eq('id', id)
  if (error) throw error
}

export async function deletePromptTemplate(id) {
  const { error } = await supabase.from('prompt_templates').delete().eq('id', id)
  if (error) throw error
}

// --- AI Content Agent (chat) -------------------------------------------------

export async function listConversations(clientId, agentName) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('agent_conversations')
    .select('id,agent_name,title,messages,updated_at')
    .eq('client_id', clientId)
    .eq('agent_name', agentName)
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function saveConversation(clientId, { id, agent_name, title, messages }) {
  const row = { client_id: clientId, agent_name, title, messages, updated_at: new Date().toISOString() }
  if (id) row.id = id
  const { data, error } = await supabase
    .from('agent_conversations')
    .upsert(row)
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function deleteConversation(id) {
  const { error } = await supabase.from('agent_conversations').delete().eq('id', id)
  if (error) throw error
}

// One Claude completion through the same-origin /claude-api proxy (key injected
// server-side). Used by the chat personas.
export async function chatComplete({ system, messages, model = 'claude-sonnet-4-6' }) {
  const res = await fetch('/claude-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 2048, system, messages }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Claude ${res.status}: ${text.slice(0, 200)}`)
  const json = JSON.parse(text)
  return (json.content || []).map((b) => b.text || '').join('').trim()
}

// --- AI Images ---------------------------------------------------------------

export async function requestImage(clientId, prompt) {
  const res = await fetch('/api/seo-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, prompt }),
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through */
  }
  if (!res.ok) throw new Error(body?.message || `Image generation failed (${res.status}).`)
  return body
}

export async function listImages(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('client_images')
    .select('id,prompt,storage_path,created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return data ?? []
}

export async function saveImage(clientId, prompt, storage_path) {
  const { error } = await supabase.from('client_images').insert({ client_id: clientId, prompt, storage_path })
  if (error) throw error
}

export async function deleteImage(id) {
  const { error } = await supabase.from('client_images').delete().eq('id', id)
  if (error) throw error
}

// --- Settings (client config + BYOK) -----------------------------------------

export async function fetchClientSettings(clientId) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('clients')
    .select('name,wordpress_url,auto_publish_on_approval,competitor_domains,plan,token_allowance,top_up_tokens')
    .eq('id', clientId)
    .single()
  if (error) throw error
  return data
}

export async function saveClientSettings(clientId, fields) {
  const { error } = await supabase.from('clients').update(fields).eq('id', clientId)
  if (error) throw error
}

export async function listApiKeys(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('api_keys')
    .select('provider,last_four,last_rotated_at')
    .eq('client_id', clientId)
  if (error) throw error
  return data ?? []
}

export async function saveApiKey(clientId, provider, secret) {
  const { error } = await supabase.from('api_keys').upsert(
    { client_id: clientId, provider, secret, last_four: secret.slice(-4), last_rotated_at: new Date().toISOString() },
    { onConflict: 'client_id,provider' },
  )
  if (error) throw error
}

// Trigger native draft generation (api/seo-generate.js, or the vite dev
// middleware). Resolves when the draft is created — synchronously in the inline
// path, or as a 'generating' row in the Inngest async path (poll for completion).
export async function requestDraftGeneration({ clientId, contentType, topic, useKnowledgeBase = true }) {
  const res = await fetch('/api/seo-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, contentType, topic, useKnowledgeBase }),
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through */
  }
  if (!res.ok) throw new Error(body?.message || `Generation failed (${res.status}).`)
  return body
}

// Trigger a native SEO job (keyword research / site analysis / SEO report).
async function postJob(payload) {
  const res = await fetch('/api/seo-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through */
  }
  if (!res.ok) throw new Error(body?.message || `Job failed (${res.status}).`)
  return body
}

export const requestKeywordResearch = (clientId, keyword) => postJob({ action: 'keyword', clientId, keyword })
export const requestSiteAnalysis = (clientId, domain) => postJob({ action: 'site', clientId, domain })
export const requestSeoReport = (clientId, domain) => postJob({ action: 'report', clientId, domain })

// Publish an approved DisruptorsMedia draft to the live marketing site
// (disruptorsmedia.com). Runs server-side (api/publish-to-main-site.js, or the
// vite dev middleware) so the main-site service-role key stays out of the
// browser. Returns { id, slug, url } of the live post.
export async function publishToMainSite(draftId) {
  const res = await fetch('/api/publish-to-main-site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId }),
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through */
  }
  if (!res.ok) throw new Error(body?.message || `Publish failed (${res.status}).`)
  return body
}

// --- Auto-blog automation (DisruptorsMedia Tue/Thu publishing) ---------------
// These read the blog_automation / blog_queue tables, which arrive with the
// auto-blog migration. They degrade to null/zero until that SQL is applied so
// the UI never crashes pre-setup.

export async function fetchBlogAutomation(clientId) {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('blog_automation')
      .select('client_id,enabled,posts_per_run,last_run_at')
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function setBlogAutomation(clientId, enabled) {
  const { error } = await supabase
    .from('blog_automation')
    .upsert({ client_id: clientId, enabled, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) {
    // Friendly message when the table isn't there yet (pre-migration).
    if (/relation .*blog_automation.* does not exist|could not find the table/i.test(error.message)) {
      throw new Error('Auto-blog isn’t set up yet — run the auto-blog SQL in Supabase first.')
    }
    throw error
  }
}

// Queue stats for the automation card: how many topics remain, what's next up,
// and how many have been published.
export async function fetchBlogQueueStats(clientId) {
  const empty = { available: false, remaining: 0, published: 0, generating: 0, next: null }
  if (!isSupabaseConfigured) return empty
  try {
    const [remaining, published, generating, next] = await Promise.all([
      supabase.from('blog_queue').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'queued'),
      supabase.from('blog_queue').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'published'),
      supabase.from('blog_queue').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'generating'),
      supabase
        .from('blog_queue')
        .select('title,primary_keyword,cluster')
        .eq('client_id', clientId)
        .eq('status', 'queued')
        .order('priority', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])
    if (remaining.error) return empty
    return {
      available: true,
      remaining: remaining.count ?? 0,
      published: published.count ?? 0,
      generating: generating.count ?? 0,
      next: next.data ?? null,
    }
  } catch {
    return empty
  }
}

// Generate a featured/hero image for a draft and attach it (returns { url }).
// Server-side (api/draft-image.js or the vite dev middleware): creates the image
// with OpenAI and uploads it to the main site's public bucket. Optional `prompt`
// overrides the auto-derived one.
export async function generateDraftImage(draftId, prompt) {
  const res = await fetch('/api/draft-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId, prompt }),
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through */
  }
  if (!res.ok) throw new Error(body?.message || `Image generation failed (${res.status}).`)
  return body
}

// --- presentation helpers ---------------------------------------------------

export function draftStatusStyle(status) {
  switch (status) {
    case 'published':
      return 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30'
    case 'approved':
      return 'bg-primary/15 text-primary border-primary/30'
    case 'pending_approval':
      return 'bg-amber-400/15 text-amber-300 border-amber-400/30'
    case 'needs_revision':
      return 'bg-orange-400/15 text-orange-300 border-orange-400/30'
    case 'generating':
    case 'queued':
      return 'bg-sky-400/15 text-sky-300 border-sky-400/30'
    case 'failed':
      return 'bg-error/15 text-error border-error/30'
    default:
      return 'bg-surface-container text-on-surface-variant border-outline'
  }
}

export const prettyStatus = (s) => String(s || '').replace(/_/g, ' ')
export const dollars = (cents) => `$${((Number(cents) || 0) / 100).toFixed(2)}`

// Normalise a site_analyses.recommendations value into { summary, items }.
// Stored either as an array (strings/objects) or as { summary, priorities: [...] }.
export function flattenRecommendations(rec) {
  const toItem = (r) => {
    if (typeof r === 'string') return { title: r, detail: '', impact: '' }
    if (r && typeof r === 'object') {
      return {
        title: r.title || r.keyword || r.recommendation || r.name || '',
        detail: r.rationale || r.content_suggestion || r.detail || r.description || '',
        impact: r.expected_impact || r.impact || r.priority || '',
      }
    }
    return { title: String(r ?? ''), detail: '', impact: '' }
  }
  if (Array.isArray(rec)) return { summary: '', items: rec.map(toItem).filter((i) => i.title) }
  if (rec && typeof rec === 'object') {
    const list = rec.priorities || rec.recommendations || rec.items || []
    return { summary: rec.summary || '', items: (Array.isArray(list) ? list : []).map(toItem).filter((i) => i.title) }
  }
  return { summary: '', items: [] }
}

const IMPACT_STYLE = {
  high: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  medium: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  low: 'bg-surface-container text-on-surface-variant border-outline',
}
export const impactStyle = (impact) =>
  IMPACT_STYLE[String(impact || '').toLowerCase()] || 'bg-surface-container text-on-surface-variant border-outline'

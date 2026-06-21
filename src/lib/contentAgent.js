// SEO/GEO data access. As of Phase 1 of the unification, the data lives in
// Mission Control's OWN Supabase project (imported via scripts/import-content-agent.mjs),
// so the read path here goes straight through the shared `supabase` client, keyed
// by the Mammoth client slug — exactly like seoKeywords.js / tasks.js.
//
// The only thing that still touches the Content Agent project is the admin link
// picker (fetchCaClients), which lists the source workspaces so an admin can map
// a Mammoth client to one for import. That convenience proxy goes away once
// native generation (Phase 2) makes the import unnecessary.
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
      supabase.from('content_usage_ledger').select('event,cost_cents,ts').eq('client_id', clientId).gte('ts', since),
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

// --- admin link picker (lists Content Agent source workspaces for import) ----
// This is the one remaining read against the Content Agent project, via the
// slim same-origin proxy. Import-config only; not on the live data path.

export const isNotConfigured = (err) => err?.code === 'not_configured'

// Trigger native draft generation (api/seo-generate.js, or the vite dev
// middleware). Resolves when the draft is created — synchronously in the inline
// path, or as a 'generating' row in the Inngest async path (poll for completion).
export async function requestDraftGeneration({ clientId, contentType, topic }) {
  const res = await fetch('/api/seo-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, contentType, topic }),
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

export async function fetchCaClients() {
  let res
  try {
    res = await fetch('/content-agent-api?resource=clients')
  } catch {
    const e = new Error('Could not reach the Content Agent service.')
    e.code = 'network'
    throw e
  }
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through */
  }
  if (!res.ok) {
    const e = new Error(body?.message || `Request failed (${res.status}).`)
    e.code = body?.error || 'http_error'
    throw e
  }
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

// Suggest the best Content Agent client for a Mammoth client by name/website.
export function suggestCaClientId(mammothClient, caClients) {
  if (!mammothClient || !Array.isArray(caClients)) return ''
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const name = norm(mammothClient.name)
  const byName = caClients.find((c) => norm(c.name) === name)
  if (byName) return byName.id
  const byPartial = caClients.find(
    (c) => norm(c.name) && (norm(c.name).includes(name) || name.includes(norm(c.name))),
  )
  return byPartial?.id || ''
}

// Shared core for the Content Agent (SEO/GEO) proxy. Used by BOTH the Vercel
// serverless function (api/content-agent.js, prod) and the Vite dev middleware
// (vite.config.js, dev) so the behaviour is identical in both environments.
//
// It reads the SEPARATE Content Agent Supabase project with that project's
// SERVICE-ROLE key (server-side only — never shipped to the browser) and exposes
// a small, GET-only, allow-listed set of read resources, each scoped to one
// Content Agent client UUID. This is how Mammoth surfaces SEO/GEO data natively
// without an iframe and without giving the browser the service-role key.
//
// Env (Mammoth .env locally; Vercel project env in prod):
//   CONTENT_AGENT_SUPABASE_URL
//   CONTENT_AGENT_SERVICE_ROLE_KEY

export function readEnv(env) {
  return {
    url: env.CONTENT_AGENT_SUPABASE_URL || '',
    key: env.CONTENT_AGENT_SERVICE_ROLE_KEY || '',
  }
}

export function isConfigured(env) {
  const { url, key } = readEnv(env)
  return Boolean(url && key)
}

// One PostgREST GET against the Content Agent project. `query` is a pre-built
// query string (without leading '?'). Throws on a non-2xx response.
async function pg(table, query, { url, key }) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : []
}

const iso30dAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

// Resource handlers. Each returns plain JSON-serialisable data.
const RESOURCES = {
  // The list of clients in the Content Agent app — used by the link picker.
  async clients(_clientId, cfg) {
    return { clients: await pg('clients', 'select=id,name,website,status&order=name.asc', cfg) }
  },

  // Aggregated dashboard payload (mirrors the Content Agent dashboard reads).
  async dashboard(clientId, cfg) {
    const cid = `client_id=eq.${clientId}`
    const since = iso30dAgo()
    const [usage, drafts, seoReports, jobs, keywords, clientRow, siteAnalysis, kb, brandVoice] =
      await Promise.all([
        pg('usage_ledger', `select=event,cost_cents,ts&${cid}&ts=gte.${since}`, cfg),
        pg('content_drafts', `select=status,cost_cents,updated_at&${cid}&updated_at=gte.${since}`, cfg),
        pg('seo_reports', `select=id,domain,generated_at,report_json&${cid}&order=generated_at.desc&limit=10`, cfg),
        pg('jobs', `select=id,kind,status,created_at&${cid}&created_at=gte.${since}&order=created_at.desc&limit=20`, cfg),
        pg('keyword_research', `select=keyword,volume,difficulty,leverage_score&${cid}&order=leverage_score.desc.nullslast&limit=10`, cfg),
        pg('clients', `select=name,website&id=eq.${clientId}`, cfg),
        pg('site_analyses', `select=id,domain,recommendations,generated_at&${cid}&status=eq.succeeded&order=generated_at.desc&limit=1`, cfg),
        pg('client_knowledge_base', `select=case_studies,brand_voice_samples,brand_guidelines,unique_facts,faq,notes,updated_at&${cid}`, cfg),
        pg('brand_voice_profiles', `select=voice_tone,target_audience,sample_copy&${cid}`, cfg),
      ])
    return {
      client: clientRow[0] ?? null,
      usage,
      drafts,
      seoReports,
      jobs,
      keywords,
      siteAnalysis: siteAnalysis[0] ?? null,
      knowledgeBase: kb[0] ?? null,
      brandVoice: brandVoice[0] ?? null,
    }
  },

  // Draft queue + per-status counts. Optional ?status= filter.
  async drafts(clientId, cfg, params) {
    const cid = `client_id=eq.${clientId}`
    let listQuery =
      `select=id,content_type,topic,status,updated_at,cost_cents,image_storage_path,wp_post_url,scheduled_at&${cid}&order=updated_at.desc&limit=100`
    if (params.status && params.status !== 'all') listQuery += `&status=eq.${params.status}`
    const [rows, all] = await Promise.all([
      pg('content_drafts', listQuery, cfg),
      pg('content_drafts', `select=status&${cid}`, cfg),
    ])
    const counts = { all: all.length }
    for (const r of all) counts[r.status] = (counts[r.status] || 0) + 1
    return { rows, counts }
  },

  // Keyword research, highest leverage first.
  async keywords(clientId, cfg) {
    const rows = await pg(
      'keyword_research',
      `select=id,keyword,volume,difficulty,intent,leverage_score,trend,ttl_at&client_id=eq.${clientId}&order=leverage_score.desc.nullslast&limit=500`,
      cfg,
    )
    return { rows }
  },

  // SEO report history + the client website (for the run-report form, later).
  async ['seo-reports'](clientId, cfg) {
    const cid = `client_id=eq.${clientId}`
    const [clientRow, reports] = await Promise.all([
      pg('clients', `select=website&id=eq.${clientId}`, cfg),
      pg('seo_reports', `select=id,domain,generated_at,pdf_storage_path,usage_billed&${cid}&order=generated_at.desc&limit=50`, cfg),
    ])
    return { website: clientRow[0]?.website ?? '', reports }
  },

  // Latest site analysis (rankings + recommendations) + the client website.
  async ['site-analysis'](clientId, cfg) {
    const cid = `client_id=eq.${clientId}`
    const [clientRow, analyses] = await Promise.all([
      pg('clients', `select=website&id=eq.${clientId}`, cfg),
      pg(
        'site_analyses',
        `select=id,domain,status,current_rankings,recommendations,error,generated_at,finished_at&${cid}&status=in.(succeeded,failed)&order=generated_at.desc&limit=1`,
        cfg,
      ),
    ])
    return { website: clientRow[0]?.website ?? '', analysis: analyses[0] ?? null }
  },
}

// Resources that don't need a clientId.
const GLOBAL_RESOURCES = new Set(['clients'])

// Main entry. Returns { status, body }. Never throws.
export async function handleContentAgent({ resource, clientId, params = {}, env }) {
  if (!isConfigured(env)) {
    return { status: 503, body: { error: 'not_configured', message: 'Content Agent is not configured on the server.' } }
  }
  const handler = RESOURCES[resource]
  if (!handler) return { status: 404, body: { error: 'unknown_resource', resource } }
  if (!GLOBAL_RESOURCES.has(resource) && !clientId) {
    return { status: 400, body: { error: 'missing_client', message: 'clientId is required for this resource.' } }
  }
  try {
    const data = await handler(clientId, readEnv(env), params)
    return { status: 200, body: data }
  } catch (e) {
    return { status: 502, body: { error: 'upstream_failed', message: String(e?.message || e) } }
  }
}

// Native SEO jobs (Phase 2): keyword research + site analysis (DataForSEO) and
// SEO reports (Google PageSpeed Insights), each persisting into Mission Control's
// own DB. Pure/server-side so they can be unit-tested and reused by Inngest.
// Faithful ports of the Content Agent flows.
//
// Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
//      DATAFORSEO_DEFAULT_LOGIN, DATAFORSEO_DEFAULT_PASSWORD, GOOGLE_PSI_KEY.
import { makeServiceClient, callClaude, costCents } from './_seoGenerateCore.js'

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const US = 2840 // DataForSEO location_code for the United States
const nowIso = () => new Date().toISOString()

function dfsAuth(env) {
  const login = env.DATAFORSEO_DEFAULT_LOGIN
  const password = env.DATAFORSEO_DEFAULT_PASSWORD
  if (!login || !password) throw new Error('DataForSEO not configured (DATAFORSEO_DEFAULT_LOGIN / DATAFORSEO_DEFAULT_PASSWORD).')
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')
}

async function dfsPost(url, auth, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const cleanDomain = (d) =>
  String(d || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '')

// Heuristic opportunity score (DataForSEO doesn't return one): reward volume,
// penalise difficulty. Used only to sort the watchlist.
function leverage(volume, difficulty) {
  if (volume == null && difficulty == null) return null
  const v = Math.log10((volume || 0) + 1) * 10
  const d = 0.5 * (100 - (difficulty ?? 50))
  return Math.round((v + d) * 10) / 10
}

// --- keyword research (DataForSEO keyword_overview) -------------------------

export async function researchKeyword({ env, clientId, keyword }) {
  if (!clientId) throw new Error('clientId is required')
  if (!keyword || !keyword.trim()) throw new Error('keyword is required')
  const db = makeServiceClient(env)
  const body = await dfsPost(
    'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live',
    dfsAuth(env),
    [{ keywords: [keyword.trim()], location_code: US, language_code: 'en' }],
  )
  const item = body.tasks?.[0]?.result?.[0]?.items?.[0]
  const volume = item?.keyword_info?.search_volume ?? null
  const difficulty = item?.keyword_properties?.keyword_difficulty ?? null
  const intent = item?.search_intent_info?.main_intent ?? null
  const trend = (item?.keyword_info?.monthly_searches ?? []).map((m) => ({
    month: `${m.year}-${String(m.month).padStart(2, '0')}`,
    volume: m.search_volume ?? 0,
  }))
  const row = {
    client_id: clientId,
    keyword: keyword.trim(),
    volume,
    difficulty,
    intent,
    leverage_score: leverage(volume, difficulty),
    trend,
    ttl_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
  const { error } = await db.from('keyword_research').upsert(row, { onConflict: 'client_id,keyword' })
  if (error) throw error
  await db.from('content_usage_ledger').insert({
    client_id: clientId, event: 'dataforseo_query', cost_cents: 1, metadata: { keyword: keyword.trim() },
  })
  return { keyword: row.keyword, volume, difficulty, intent }
}

// --- site analysis (DataForSEO rankings + Claude strategy) ------------------

const STRATEGY_SYSTEM = `You are a senior SEO strategist. The user gives you a domain, optional brand/positioning and knowledge-base summaries, the keywords the site ALREADY ranks for (with position, volume, difficulty, intent), and optionally competitor rankings.

Recommend 10-15 keywords to PRIORITIZE for content over the next 90 days.

Rules:
- Skip keywords already ranking <= 3.
- Heavily favor rank 4-30 with volume >= 100.
- When competitor rankings are present, prioritize keywords where at least one competitor ranks top-20 and the client does not rank or ranks worse.
- Prefer high-impact, lower-difficulty wins; downrank difficulty > 70.
- Match content type to intent: informational -> blog_post or faq, commercial -> service_page, transactional -> product_description.

Output STRICT JSON only (no preamble, no markdown fences):
{
  "summary": "<2-3 sentence executive summary>",
  "priorities": [
    {
      "keyword": "<keyword>",
      "rationale": "<one sentence>",
      "current_rank": <number or null>,
      "search_volume_estimate": <number or null>,
      "expected_impact": "high" | "medium" | "low",
      "content_suggestion": "<one-sentence angle>",
      "suggested_content_type": "blog_post" | "service_page" | "faq" | "product_description" | "email",
      "competitor_signal": <null or "competitor.com ranks #5; you don't rank">
    }
  ]
}`

export async function runSiteAnalysis({ env, clientId, domain, analysisId = null }) {
  if (!clientId) throw new Error('clientId is required')
  const dom = cleanDomain(domain)
  if (!dom) throw new Error('domain is required')
  const db = makeServiceClient(env)

  // Ensure a row exists and is marked running.
  let id = analysisId
  if (id) {
    await db.from('site_analyses').update({ status: 'running', domain: dom }).eq('id', id)
  } else {
    const { data, error } = await db
      .from('site_analyses')
      .insert({ client_id: clientId, domain: dom, status: 'running' })
      .select('id')
      .single()
    if (error) throw error
    id = data.id
  }

  try {
    // 1) Rankings the domain already holds.
    const body = await dfsPost(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/keywords_for_site/live',
      dfsAuth(env),
      [{ target: dom, location_code: US, language_code: 'en', limit: 200 }],
    )
    const items = body.tasks?.[0]?.result?.[0]?.items ?? []
    const rankings = items
      .map((it) => ({
        keyword: it.keyword_data?.keyword ?? '',
        rank: it.ranked_serp_element?.serp_item?.rank_absolute ?? null,
        volume: it.keyword_data?.keyword_info?.search_volume ?? null,
        difficulty: it.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
        intent: it.keyword_data?.search_intent_info?.main_intent ?? null,
      }))
      .filter((k) => k.keyword)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 100)

    // 2) Brand + KB summaries for context.
    const [voice, kb] = await Promise.all([
      db.from('brand_voice_profiles').select('voice_tone,target_audience,sample_copy').eq('client_id', clientId).maybeSingle(),
      db.from('client_knowledge_base').select('case_studies,unique_facts').eq('client_id', clientId).maybeSingle(),
    ])
    const brandSummary = [voice.data?.voice_tone, voice.data?.target_audience].filter(Boolean).join(' — ')
    const kbSummary = [kb.data?.case_studies, kb.data?.unique_facts].filter(Boolean).join(' ').slice(0, 1500)

    // 3) Claude strategy.
    const userPrompt =
      `Domain: ${dom}\n\n` +
      (brandSummary ? `Brand summary: ${brandSummary}\n\n` : '') +
      (kbSummary ? `Knowledge base summary: ${kbSummary}\n\n` : '') +
      `Current rankings (top ${rankings.length} by volume):\n` +
      JSON.stringify(
        rankings.map((k) => ({ kw: k.keyword, rank: k.rank, vol: k.volume, diff: k.difficulty, intent: k.intent })),
        null, 2,
      ).slice(0, 8000) +
      `\n\nReturn the JSON now.`

    const gen = await callClaude({ apiKey: env.ANTHROPIC_API_KEY, model: DEFAULT_MODEL, system: STRATEGY_SYSTEM, user: userPrompt })
    let recommendations = { summary: '', priorities: [] }
    try {
      const cleaned = gen.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '')
      const parsed = JSON.parse(cleaned)
      if (parsed && Array.isArray(parsed.priorities)) recommendations = parsed
    } catch {
      /* keep empty recommendations on parse failure */
    }

    await db.from('site_analyses').update({
      status: 'succeeded',
      current_rankings: rankings,
      recommendations,
      finished_at: nowIso(),
    }).eq('id', id)

    await db.from('content_usage_ledger').insert([
      { client_id: clientId, event: 'dataforseo_query', cost_cents: 5, metadata: { kind: 'keywords_for_site', domain: dom } },
      { client_id: clientId, event: 'claude_call', cost_cents: costCents(DEFAULT_MODEL, gen.inTok, gen.outTok), tokens: gen.inTok + gen.outTok, metadata: { purpose: 'site-analysis' } },
    ])

    return { analysisId: id, rankings: rankings.length, priorities: recommendations.priorities?.length ?? 0 }
  } catch (e) {
    await db.from('site_analyses').update({ status: 'failed', error: String(e?.message || e), finished_at: nowIso() }).eq('id', id)
    throw e
  }
}

// --- SEO report (Google PageSpeed Insights + Claude synthesis) --------------

async function runPageSpeed(env, url, strategy = 'mobile') {
  const params = new URLSearchParams({ url, strategy })
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) params.append('category', c)
  if (env.GOOGLE_PSI_KEY) params.set('key', env.GOOGLE_PSI_KEY)
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`)
  const text = await res.text()
  if (!res.ok) throw new Error(`PageSpeed ${res.status}: ${text.slice(0, 200)}`)
  const lh = JSON.parse(text).lighthouseResult || {}
  const pct = (id) => {
    const s = lh.categories?.[id]?.score
    return typeof s === 'number' ? Math.round(s * 100) : null
  }
  const metric = (id) => lh.audits?.[id]?.numericValue ?? null
  const audits = Object.entries(lh.audits || {})
    .filter(([, a]) => typeof a?.score === 'number' && a.score < 0.9)
    .slice(0, 20)
    .map(([id, a]) => ({ id, title: a.title ?? id, score: a.score ?? null, displayValue: a.displayValue ?? null }))
  return {
    url, strategy,
    performance: pct('performance'),
    accessibility: pct('accessibility'),
    bestPractices: pct('best-practices'),
    seo: pct('seo'),
    cwv: {
      lcpMs: metric('largest-contentful-paint'),
      inpMs: metric('interactive'),
      clsValue: metric('cumulative-layout-shift'),
    },
    audits,
  }
}

const REPORT_SYSTEM =
  'You are an SEO consultant. Given a JSON snapshot of audit results, write a tight executive summary (3-5 sentences) followed by a numbered list of the top 5 priority actions, each one sentence. No preamble, no markdown headings.'

export async function runSeoReport({ env, clientId, domain }) {
  if (!clientId) throw new Error('clientId is required')
  const dom = cleanDomain(domain)
  if (!dom) throw new Error('domain is required')
  const db = makeServiceClient(env)
  const url = `https://${dom}`

  const pagespeed = await runPageSpeed(env, url, 'mobile')

  const summaryInput = JSON.stringify(
    { pagespeed: { perf: pagespeed.performance, seo: pagespeed.seo, a11y: pagespeed.accessibility, cwv: pagespeed.cwv, failingAudits: pagespeed.audits.slice(0, 10) } },
    null, 2,
  ).slice(0, 12000)
  const gen = await callClaude({ apiKey: env.ANTHROPIC_API_KEY, model: DEFAULT_MODEL, system: REPORT_SYSTEM, user: summaryInput })

  const report_json = { pagespeed, synthesis: gen.text, providers: { pagespeed: 'google_psi', synthesis: 'claude' }, generated_at: nowIso() }
  const { data, error } = await db
    .from('seo_reports')
    .insert({ client_id: clientId, domain: dom, report_json, usage_billed: true, generated_at: nowIso() })
    .select('id')
    .single()
  if (error) throw error

  await db.from('content_usage_ledger').insert({
    client_id: clientId, event: 'seo_report', cost_cents: costCents(DEFAULT_MODEL, gen.inTok, gen.outTok), tokens: gen.inTok + gen.outTok, metadata: { domain: dom },
  })
  return { reportId: data.id, performance: pagespeed.performance, seo: pagespeed.seo }
}

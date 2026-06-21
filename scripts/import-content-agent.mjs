// Import SEO/GEO data from the Content Agent Supabase project INTO Mission
// Control's own database (Phase 1 of unifying the two apps). Idempotent: re-run
// any time to refresh — rows upsert on their natural/source key.
//
// Mapping: each Mammoth client whose features.contentAgentClientId is set pulls
// that Content Agent workspace's rows, rewritten with the Mammoth slug client_id.
//
// Requires (in .env): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, USERNAME,
// PASSWORD (admin sign-in, so RLS allows the writes) and CONTENT_AGENT_SUPABASE_URL,
// CONTENT_AGENT_SERVICE_ROLE_KEY (to read the source).
//
// Run: node scripts/import-content-agent.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}

const need = (k) => {
  if (!env[k]) {
    console.error(`Missing ${k} in .env`)
    process.exit(1)
  }
  return env[k]
}

const CA_URL = need('CONTENT_AGENT_SUPABASE_URL')
const CA_KEY = need('CONTENT_AGENT_SERVICE_ROLE_KEY')

// Read a Content Agent table (service role, bypasses RLS).
async function caSelect(table, query) {
  const res = await fetch(`${CA_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: CA_KEY, Authorization: `Bearer ${CA_KEY}`, Accept: 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : []
}

// What to copy. Each: CA table, the columns to read, how to map a CA row to a
// Mammoth row (given the slug), and the upsert conflict target.
const JOBS = [
  {
    label: 'content_drafts',
    from: 'content_drafts',
    select: 'id,content_type,topic,original,humanized,status,model,cost_cents,image_storage_path,wp_post_url,scheduled_at,created_at,updated_at',
    to: 'content_drafts',
    onConflict: 'source_id',
    map: (r, slug) => ({
      client_id: slug, source_id: r.id, content_type: r.content_type, topic: r.topic,
      original: r.original, humanized: r.humanized, status: r.status, model: r.model,
      cost_cents: r.cost_cents ?? 0, image_storage_path: r.image_storage_path,
      wp_post_url: r.wp_post_url, scheduled_at: r.scheduled_at,
      created_at: r.created_at, updated_at: r.updated_at,
    }),
  },
  {
    label: 'keyword_research',
    from: 'keyword_research',
    select: 'keyword,volume,difficulty,intent,leverage_score,trend,ttl_at,created_at',
    to: 'keyword_research',
    onConflict: 'client_id,keyword',
    map: (r, slug) => ({
      client_id: slug, keyword: r.keyword, volume: r.volume, difficulty: r.difficulty,
      intent: r.intent, leverage_score: r.leverage_score, trend: r.trend,
      ttl_at: r.ttl_at, created_at: r.created_at,
    }),
  },
  {
    label: 'seo_reports',
    from: 'seo_reports',
    select: 'id,domain,report_json,pdf_storage_path,usage_billed,generated_at,created_at',
    to: 'seo_reports',
    onConflict: 'source_id',
    map: (r, slug) => ({
      client_id: slug, source_id: r.id, domain: r.domain, report_json: r.report_json,
      pdf_storage_path: r.pdf_storage_path, usage_billed: r.usage_billed ?? false,
      generated_at: r.generated_at, created_at: r.created_at,
    }),
  },
  {
    label: 'site_analyses',
    from: 'site_analyses',
    select: 'id,domain,status,current_rankings,recommendations,error,generated_at,finished_at',
    to: 'site_analyses',
    onConflict: 'source_id',
    map: (r, slug) => ({
      client_id: slug, source_id: r.id, domain: r.domain, status: r.status,
      current_rankings: r.current_rankings, recommendations: r.recommendations,
      error: r.error, generated_at: r.generated_at, finished_at: r.finished_at,
    }),
  },
  {
    label: 'usage_ledger',
    from: 'usage_ledger',
    select: 'id,event,cost_cents,tokens,metadata,ts',
    to: 'content_usage_ledger',
    onConflict: 'source_id',
    map: (r, slug) => ({
      client_id: slug, source_id: r.id, event: r.event, cost_cents: r.cost_cents ?? 0,
      tokens: r.tokens, metadata: r.metadata, ts: r.ts,
    }),
  },
  {
    label: 'jobs',
    from: 'jobs',
    select: 'id,kind,status,progress,result,error,created_at',
    to: 'content_jobs',
    onConflict: 'source_id',
    map: (r, slug) => ({
      client_id: slug, source_id: r.id, kind: r.kind, status: r.status,
      progress: r.progress ?? 0, result: r.result, error: r.error, created_at: r.created_at,
    }),
  },
  {
    label: 'brand_voice_profiles',
    from: 'brand_voice_profiles',
    select: 'voice_tone,banned_words,target_audience,sample_copy,metadata,created_at',
    to: 'brand_voice_profiles',
    onConflict: 'client_id',
    map: (r, slug) => ({
      client_id: slug, voice_tone: r.voice_tone, banned_words: r.banned_words,
      target_audience: r.target_audience, sample_copy: r.sample_copy,
      metadata: r.metadata, created_at: r.created_at,
    }),
  },
  {
    label: 'client_knowledge_base',
    from: 'client_knowledge_base',
    select: 'case_studies,brand_voice_samples,unique_facts,faq,notes,brand_guidelines,updated_at',
    to: 'client_knowledge_base',
    onConflict: 'client_id',
    map: (r, slug) => ({
      client_id: slug, case_studies: r.case_studies, brand_voice_samples: r.brand_voice_samples,
      unique_facts: r.unique_facts, faq: r.faq, notes: r.notes,
      brand_guidelines: r.brand_guidelines, updated_at: r.updated_at,
    }),
  },
]

// --- run --------------------------------------------------------------------

const mc = createClient(need('VITE_SUPABASE_URL'), need('VITE_SUPABASE_ANON_KEY'))
const { error: authErr } = await mc.auth.signInWithPassword({
  email: need('USERNAME'),
  password: need('PASSWORD'),
})
if (authErr) {
  console.error('Mammoth admin sign-in failed:', authErr.message)
  process.exit(1)
}

// Mammoth clients that are linked to a Content Agent workspace.
const { data: clients, error: clientsErr } = await mc.from('clients').select('id, features')
if (clientsErr) {
  console.error('Could not read clients:', clientsErr.message)
  process.exit(1)
}
const links = (clients ?? [])
  .map((c) => ({ slug: c.id, caId: c.features?.contentAgentClientId }))
  .filter((l) => l.caId)

if (links.length === 0) {
  console.error('No clients linked to a Content Agent workspace (features.contentAgentClientId). Link one in the SEO/GEO page first.')
  process.exit(1)
}

console.log(`Importing for ${links.length} linked client(s): ${links.map((l) => l.slug).join(', ')}\n`)

const summary = {}
for (const { slug, caId } of links) {
  for (const job of JOBS) {
    const key = `${slug}/${job.label}`
    try {
      const rows = await caSelect(job.from, `select=${job.select}&client_id=eq.${caId}`)
      if (rows.length === 0) {
        summary[key] = '0'
        continue
      }
      const mapped = rows.map((r) => job.map(r, slug))
      const { error } = await mc.from(job.to).upsert(mapped, { onConflict: job.onConflict })
      summary[key] = error ? `ERROR: ${error.message}` : String(mapped.length)
    } catch (e) {
      summary[key] = `ERROR: ${String(e?.message || e)}`
    }
  }
}

console.table(summary)
const failures = Object.entries(summary).filter(([, v]) => v.startsWith('ERROR'))
if (failures.length) {
  console.error(`\n${failures.length} import step(s) failed.`)
  process.exit(1)
}
console.log('\nImport complete.')

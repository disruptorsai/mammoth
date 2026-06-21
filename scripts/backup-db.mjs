// One-off logical backup of the Mammoth Supabase DB.
// Signs in as the admin (USERNAME/PASSWORD from .env) so RLS lets us read every
// table, then dumps each to JSON under ../backups/db-<stamp>/.
// Run: node scripts/backup-db.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Parse .env (simple KEY=VALUE, ignores comments/blank lines).
const env = {}
for (const line of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}

const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
const email = env.USERNAME
const password = env.PASSWORD
if (!url || !anon || !email || !password) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / USERNAME / PASSWORD in .env')
  process.exit(1)
}

// Every table we know about across migrations 0001-0014.
const TABLES = [
  'profiles', 'clients', 'tasks', 'content_posts', 'leads', 'ad_campaigns',
  'seo_keywords', 'usage_events', 'client_secrets', 'activity', 'activities',
  // SEO/GEO (Content Agent) tables added by migration 0015.
  'content_drafts', 'keyword_research', 'seo_reports', 'site_analyses',
  'content_usage_ledger', 'content_jobs', 'brand_voice_profiles', 'client_knowledge_base',
]

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outDir = join(root, '..', 'backups', `db-${stamp}`)
mkdirSync(outDir, { recursive: true })

const supabase = createClient(url, anon)
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
if (authErr) {
  console.error('Sign-in failed:', authErr.message)
  process.exit(1)
}
console.log('Signed in as', email)

const summary = {}
for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    summary[table] = `SKIPPED (${error.message})`
    continue
  }
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(data, null, 2))
  summary[table] = `${data.length} rows`
}

writeFileSync(join(outDir, '_summary.json'), JSON.stringify(summary, null, 2))
console.log('Backup written to', outDir)
console.table(summary)

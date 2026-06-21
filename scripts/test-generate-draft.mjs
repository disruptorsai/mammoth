// Exercise the native draft-generation core end-to-end against the real DB +
// Claude, without Inngest/HTTP. Writes one draft for the given client.
//
// Usage: node scripts/test-generate-draft.mjs [clientSlug] [contentType] "[topic]"
// Defaults: disruptors-media blog_post "How AI automation helps small businesses"
//
// Requires in .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { generateDraft } from '../api/_seoGenerateCore.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}

const [, , clientId = 'disruptors-media', contentType = 'blog_post', topic = 'How AI automation helps small businesses'] = process.argv

console.log(`Generating ${contentType} for "${clientId}" — topic: ${topic}\n`)
try {
  const res = await generateDraft({ env, clientId, contentType, topic })
  console.log('OK:', res)
  console.log('\nRe-run the SEO/GEO Drafts tab to see it (status: pending_approval).')
} catch (e) {
  console.error('FAILED:', e.message)
  process.exit(1)
}

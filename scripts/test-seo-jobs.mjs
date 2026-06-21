// Exercise the native SEO job cores against the real APIs + DB.
// Usage: node scripts/test-seo-jobs.mjs <keyword|site|report> [clientSlug] [arg]
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { researchKeyword, runSiteAnalysis, runSeoReport } from '../api/_seoJobsCore.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const l of readFileSync(join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}

const [, , action = 'keyword', clientId = 'disruptors-media', arg] = process.argv
try {
  let res
  if (action === 'keyword') res = await researchKeyword({ env, clientId, keyword: arg || 'ai automation for small business' })
  else if (action === 'site') res = await runSiteAnalysis({ env, clientId, domain: arg || 'disruptorsmedia.com' })
  else if (action === 'report') res = await runSeoReport({ env, clientId, domain: arg || 'disruptorsmedia.com' })
  else throw new Error('action must be keyword|site|report')
  console.log(action, 'OK:', JSON.stringify(res))
} catch (e) {
  console.error(action, 'FAILED:', e.message)
  process.exit(1)
}

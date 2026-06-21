// Client for the Content Agent (SEO/GEO) data, served by the same-origin
// /content-agent-api proxy (dev: vite middleware; prod: api/content-agent.js).
// The proxy holds the Content Agent service-role key — the browser only ever
// talks to our own origin. Errors carry a `.code` so the UI can distinguish
// "not configured on the server" from a real failure and degrade gracefully.

class ContentAgentError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

async function caFetch(resource, params = {}) {
  const qs = new URLSearchParams({ resource, ...params }).toString()
  let res
  try {
    res = await fetch(`/content-agent-api?${qs}`)
  } catch (e) {
    throw new ContentAgentError('Could not reach the Content Agent service.', 'network')
  }
  let body = null
  try {
    body = await res.json()
  } catch {
    /* fall through to status check */
  }
  if (!res.ok) {
    throw new ContentAgentError(
      body?.message || `Request failed (${res.status}).`,
      body?.error || 'http_error',
    )
  }
  return body
}

export const isNotConfigured = (err) => err?.code === 'not_configured'

export const fetchCaClients = () => caFetch('clients')
export const fetchDashboard = (clientId) => caFetch('dashboard', { clientId })
export const fetchDrafts = (clientId, status = 'all') => caFetch('drafts', { clientId, status })
export const fetchCaKeywords = (clientId) => caFetch('keywords', { clientId })
export const fetchSeoReports = (clientId) => caFetch('seo-reports', { clientId })
export const fetchSiteAnalysis = (clientId) => caFetch('site-analysis', { clientId })

// --- presentation helpers ---------------------------------------------------

// Map a Content Agent draft status to a Tailwind badge style (black/gold theme).
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
// The Content Agent stores it either as an array (of strings or objects) or as
// an object like { summary, priorities: [...] }. Each item -> { title, detail, impact }.
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

// Suggest the best Content Agent client for a Mammoth client by matching name
// or website host. Returns the CA client id or '' if no confident match.
export function suggestCaClientId(mammothClient, caClients) {
  if (!mammothClient || !Array.isArray(caClients)) return ''
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const host = (s) => {
    try {
      return new URL(s).host.replace(/^www\./, '').toLowerCase()
    } catch {
      return ''
    }
  }
  const name = norm(mammothClient.name)
  const byName = caClients.find((c) => norm(c.name) === name)
  if (byName) return byName.id
  // looser: one name contains the other
  const byPartial = caClients.find(
    (c) => norm(c.name) && (norm(c.name).includes(name) || name.includes(norm(c.name))),
  )
  return byPartial?.id || ''
}

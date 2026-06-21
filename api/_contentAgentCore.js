// Shared core for the Content Agent link proxy. Used by BOTH the Vercel
// serverless function (api/content-agent.js, prod) and the Vite dev middleware
// (vite.config.js, dev).
//
// As of Phase 1 of unifying the two apps, all SEO/GEO DATA lives in Mission
// Control's own Supabase project and is read directly by the browser (see
// src/lib/contentAgent.js). The ONLY thing left here is `resource=clients`: it
// lists the Content Agent source workspaces so an admin can map a Mammoth client
// to one for the import script. This whole file goes away once native generation
// (Phase 2) removes the need to import.
//
// Env (Mammoth .env locally; Vercel project env in prod):
//   CONTENT_AGENT_SUPABASE_URL, CONTENT_AGENT_SERVICE_ROLE_KEY

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

async function pg(table, query, { url, key }) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : []
}

const RESOURCES = {
  // List Content Agent workspaces for the admin link/import picker.
  async clients(_clientId, cfg) {
    return { clients: await pg('clients', 'select=id,name,website,status&order=name.asc', cfg) }
  },
}

// Main entry. Returns { status, body }. Never throws.
export async function handleContentAgent({ resource, env }) {
  if (!isConfigured(env)) {
    return { status: 503, body: { error: 'not_configured', message: 'Content Agent is not configured on the server.' } }
  }
  const handler = RESOURCES[resource]
  if (!handler) return { status: 404, body: { error: 'unknown_resource', resource } }
  try {
    const data = await handler(null, readEnv(env))
    return { status: 200, body: data }
  } catch (e) {
    return { status: 502, body: { error: 'upstream_failed', message: String(e?.message || e) } }
  }
}

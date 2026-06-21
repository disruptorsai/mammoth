// Vercel serverless function — same-origin proxy to the Content Agent (SEO/GEO)
// Supabase project. The browser calls /content-agent-api?resource=...&clientId=...
// (rewritten here via vercel.json); the Content Agent SERVICE-ROLE key is injected
// server-side and never reaches the bundle. All logic lives in _contentAgentCore.js
// so dev (vite middleware) and prod behave identically.
//
// Env (Vercel project settings + local .env):
//   CONTENT_AGENT_SUPABASE_URL, CONTENT_AGENT_SERVICE_ROLE_KEY
import { handleContentAgent } from './_contentAgentCore.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const url = new URL(req.url, 'http://localhost')
  const resource = url.searchParams.get('resource') || ''
  const clientId = url.searchParams.get('clientId') || ''
  const params = Object.fromEntries(url.searchParams.entries())

  const { status, body } = await handleContentAgent({ resource, clientId, params, env: process.env })
  res.status(status).json(body)
}

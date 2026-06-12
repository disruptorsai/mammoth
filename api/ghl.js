// Vercel serverless function — same-origin proxy to the GoHighLevel API.
// The browser calls /ghl-api/<path>?<params> (rewritten here via vercel.json);
// GHL_API_KEY is injected server-side and never reaches the bundle.
//
// Auth modes (set GHL_AUTH_MODE if needed; defaults to v2):
//   v2 (default) — Private Integration token -> services.leadconnectorhq.com
//                  with Authorization: Bearer + Version: 2021-07-28
//   v1           — legacy location API key  -> rest.gohighlevel.com/v1
//
// Env (Vercel project settings + local .env): GHL_API_KEY, optional GHL_AUTH_MODE.

const ALLOWED_PATHS = [/^opportunities\/search$/, /^opportunities\/pipelines$/, /^locations\/[\w-]+$/]

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.GHL_API_KEY
  if (!key) {
    res.status(500).json({ error: 'GHL_API_KEY is not configured on the server.' })
    return
  }

  const url = new URL(req.url, 'http://localhost')
  const path = (url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '')
  url.searchParams.delete('path')

  if (!ALLOWED_PATHS.some((re) => re.test(path))) {
    res.status(403).json({ error: 'Path not allowed.' })
    return
  }

  const mode = process.env.GHL_AUTH_MODE === 'v1' ? 'v1' : 'v2'
  const base = mode === 'v1' ? 'https://rest.gohighlevel.com/v1' : 'https://services.leadconnectorhq.com'
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    ...(mode === 'v2' ? { Version: '2021-07-28' } : {}),
  }

  try {
    const qs = url.searchParams.toString()
    const upstream = await fetch(`${base}/${path}${qs ? `?${qs}` : ''}`, { headers })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach GoHighLevel: ' + String(e?.message || e) })
  }
}

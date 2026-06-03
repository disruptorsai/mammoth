// Vercel serverless function — same-origin proxy to the Vista Social MCP endpoint.
// This is the production equivalent of the dev-only Vite proxy (see vite.config.js):
// it injects VISTA_SOCIAL_API_KEY server-side so the key never reaches the browser,
// and avoids CORS by being same-origin (the client calls /vista-mcp).
//
// Set VISTA_SOCIAL_API_KEY in the Vercel project: Settings -> Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.VISTA_SOCIAL_API_KEY
  if (!key) {
    res.status(500).json({ error: 'VISTA_SOCIAL_API_KEY is not configured on the server.' })
    return
  }

  try {
    const upstream = await fetch(
      `https://vistasocial.com/api/integration/mcp?api_key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}),
      },
    )
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach Vista Social: ' + String(e?.message || e) })
  }
}

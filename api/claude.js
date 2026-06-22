// Vercel serverless function — same-origin proxy to the Anthropic Messages API.
// Mirrors api/vista-mcp.js: the browser calls /claude-api and the key is
// injected server-side (never reaches the bundle). Guards: messages endpoint
// only, model allowlist, max_tokens cap.
//
// Set ANTHROPIC_API_KEY in the Vercel project: Settings -> Environment Variables.

const ALLOWED_MODELS = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']
const MAX_TOKENS_CAP = 4096

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' })
      return
    }
  }
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) {
    res.status(400).json({ error: 'Body must be a Messages API request.' })
    return
  }
  if (!ALLOWED_MODELS.includes(body.model)) {
    res.status(400).json({ error: 'Model not allowed.' })
    return
  }
  body.max_tokens = Math.min(Number(body.max_tokens) || 1024, MAX_TOKENS_CAP)

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach the AI service: ' + String(e?.message || e) })
  }
}

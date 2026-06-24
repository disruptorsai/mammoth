// Browser-callable endpoint: publish an approved DisruptorsMedia draft to the
// public marketing site (disruptorsmedia.com `posts` table). Runs server-side
// (Vercel function) so the main-site service-role key never reaches the browser
// — same pattern as api/seo-generate.js. Dev equivalent: vite.config.js
// middleware on the same path.
import { publishDraftToMainSite } from './_publishMainSiteCore.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ error: 'invalid_json' })
      return
    }
  }
  const draftId = body?.draftId
  if (!draftId) {
    res.status(400).json({ error: 'missing_fields', message: 'draftId is required.' })
    return
  }

  try {
    const result = await publishDraftToMainSite({ env: process.env, draftId })
    res.status(200).json(result)
  } catch (e) {
    res.status(502).json({ error: 'publish_failed', message: String(e?.message || e) })
  }
}

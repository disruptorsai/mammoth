// Browser-callable endpoint: generate + attach a featured image to a draft.
// Server-side (Vercel function) so the OpenAI key + main-site service-role key
// never reach the browser. Dev equivalent: vite.config.js middleware.
import { generateDraftImage } from './_draftImageCore.js'

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
    const result = await generateDraftImage({ env: process.env, draftId, prompt: body?.prompt })
    res.status(200).json(result)
  } catch (e) {
    res.status(502).json({ error: 'image_failed', message: String(e?.message || e) })
  }
}

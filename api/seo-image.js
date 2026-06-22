// Browser-callable AI image generation (Vercel function). Generates with OpenAI
// and returns a base64 data URL; the client persists it into client_images.
import { generateImage } from './_seoImageCore.js'

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
  if (!body?.prompt) {
    res.status(400).json({ error: 'missing_fields', message: 'prompt is required.' })
    return
  }
  try {
    res.status(200).json(await generateImage({ env: process.env, prompt: body.prompt }))
  } catch (e) {
    res.status(502).json({ error: 'image_failed', message: String(e?.message || e) })
  }
}

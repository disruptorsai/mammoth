// Browser-callable trigger for SEO/GEO draft generation (Vercel function).
// Default: run the generation inline and return the finished draft (simple,
// works within the function timeout for a single Claude call). Set
// SEO_GENERATE_USE_INNGEST=1 (with Inngest registered) to switch to the async
// path: create a 'generating' draft, fire the event, return 202 immediately, and
// let the Inngest function finish it. Either way the work is the same core.
import { generateDraft, makeServiceClient } from './_seoGenerateCore.js'

const TYPES = ['blog_post', 'service_page', 'faq', 'product_description', 'email']

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
  const clientId = body?.clientId
  const contentType = TYPES.includes(body?.contentType) ? body.contentType : 'blog_post'
  const topic = (body?.topic || '').trim()
  // Knowledge base is on unless the caller explicitly passes false.
  const useKnowledgeBase = body?.useKnowledgeBase !== false
  if (!clientId || !topic) {
    res.status(400).json({ error: 'missing_fields', message: 'clientId and topic are required.' })
    return
  }

  try {
    if (process.env.SEO_GENERATE_USE_INNGEST === '1' && process.env.INNGEST_EVENT_KEY) {
      const db = makeServiceClient(process.env)
      const { data, error } = await db
        .from('content_drafts')
        .insert({ client_id: clientId, content_type: contentType, topic, status: 'generating' })
        .select('id')
        .single()
      if (error) throw error
      const { inngest } = await import('./_inngestApp.js')
      await inngest.send({
        name: 'mc/content.generate.requested',
        data: { clientId, contentType, topic, draftId: data.id, useKnowledgeBase },
      })
      res.status(202).json({ draftId: data.id, async: true })
      return
    }

    const result = await generateDraft({ env: process.env, clientId, contentType, topic, useKnowledgeBase })
    res.status(200).json({ ...result, async: false })
  } catch (e) {
    res.status(502).json({ error: 'generation_failed', message: String(e?.message || e) })
  }
}

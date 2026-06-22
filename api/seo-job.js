// Browser-callable trigger for the native SEO jobs (Vercel function): keyword
// research, site analysis, SEO report. Runs the core inline by default (works
// within the function timeout); set SEO_GENERATE_USE_INNGEST=1 (with Inngest
// registered) to dispatch via events instead. Same cores either way.
import { researchKeyword, runSiteAnalysis, runSeoReport } from './_seoJobsCore.js'
import { makeServiceClient } from './_seoGenerateCore.js'

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
  const { action, clientId } = body || {}
  if (!clientId || !action) {
    res.status(400).json({ error: 'missing_fields', message: 'action and clientId are required.' })
    return
  }

  const useInngest = process.env.SEO_GENERATE_USE_INNGEST === '1' && process.env.INNGEST_EVENT_KEY

  try {
    if (action === 'keyword') {
      if (useInngest) {
        const { inngest } = await import('./_inngestApp.js')
        await inngest.send({ name: 'mc/keyword.research.requested', data: { clientId, keyword: body.keyword } })
        res.status(202).json({ async: true })
        return
      }
      res.status(200).json({ ...(await researchKeyword({ env: process.env, clientId, keyword: body.keyword })), async: false })
      return
    }

    if (action === 'site') {
      if (useInngest) {
        const db = makeServiceClient(process.env)
        const { data } = await db.from('site_analyses').insert({ client_id: clientId, domain: body.domain, status: 'queued' }).select('id').single()
        const { inngest } = await import('./_inngestApp.js')
        await inngest.send({ name: 'mc/site.analysis.requested', data: { clientId, domain: body.domain, analysisId: data?.id } })
        res.status(202).json({ analysisId: data?.id, async: true })
        return
      }
      res.status(200).json({ ...(await runSiteAnalysis({ env: process.env, clientId, domain: body.domain })), async: false })
      return
    }

    if (action === 'report') {
      if (useInngest) {
        const { inngest } = await import('./_inngestApp.js')
        await inngest.send({ name: 'mc/seo.report.requested', data: { clientId, domain: body.domain } })
        res.status(202).json({ async: true })
        return
      }
      res.status(200).json({ ...(await runSeoReport({ env: process.env, clientId, domain: body.domain })), async: false })
      return
    }

    res.status(400).json({ error: 'unknown_action', action })
  } catch (e) {
    res.status(502).json({ error: 'job_failed', message: String(e?.message || e) })
  }
}

// Manual / backup auto-blog trigger (POST with CRON_SECRET). The SCHEDULED
// Tue/Thu path runs on the Supabase Edge Function (supabase/functions/auto-blog)
// because a full Sonnet generation (~55-63s) exceeds Vercel Hobby's 60s cap.
// This endpoint shares the same _autoBlogCore logic for a manual "run now" (pass
// {force:true} to bypass the toggle); keep runs to ~1 post so it fits in 60s.
import { runAutoBlog } from './_autoBlogCore.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  // Auth: shared secret via Authorization: Bearer, x-cron-secret, or ?secret=.
  const secret = process.env.CRON_SECRET
  const provided =
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.headers['x-cron-secret'] ||
    (typeof req.query?.secret === 'string' ? req.query.secret : '')
  if (!secret || provided !== secret) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  try {
    const result = await runAutoBlog({ env: process.env, force: body?.force === true })
    res.status(200).json(result)
  } catch (e) {
    res.status(502).json({ error: 'auto_blog_failed', message: String(e?.message || e) })
  }
}

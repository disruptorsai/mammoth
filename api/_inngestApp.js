// Inngest app for Mission Control background jobs (Phase 2). The generation
// logic lives in _seoGenerateCore.js; the Inngest function just wraps it in a
// retriable step and (later) reports job progress. This is the scalable/async
// path used in production; local dev runs the core inline (see vite.config.js).
//
// Env (server-side): INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY (+ the generation
// env the core needs). Register the app by pointing Inngest at /api/inngest.
import { Inngest } from 'inngest'
import { generateDraft, makeServiceClient } from './_seoGenerateCore.js'

export const inngest = new Inngest({ id: 'mission-control' })

// Draft generation: triggered by content/generate.requested. Concurrency capped
// per client so one busy client can't starve the others.
export const generateContent = inngest.createFunction(
  { id: 'generate-content', name: 'Generate content draft', concurrency: { key: 'event.data.clientId', limit: 5 } },
  { event: 'content/generate.requested' },
  async ({ event, step }) => {
    const { clientId, contentType, topic, draftId } = event.data
    const result = await step.run('generate-draft', () =>
      generateDraft({ env: process.env, clientId, contentType, topic, draftId }),
    )
    return result
  },
)

// On failure, mark the pre-created draft as failed so the UI doesn't spin forever.
export const generateContentFailed = inngest.createFunction(
  { id: 'generate-content-failed' },
  { event: 'inngest/function.failed', if: "event.data.function_id == 'mission-control-generate-content'" },
  async ({ event }) => {
    const draftId = event.data?.event?.data?.draftId
    if (!draftId) return { skipped: true }
    const db = makeServiceClient(process.env)
    await db.from('content_drafts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', draftId)
    return { draftId, status: 'failed' }
  },
)

export const functions = [generateContent, generateContentFailed]

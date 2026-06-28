// Inngest app for Mission Control background jobs (Phase 2). The generation
// logic lives in _seoGenerateCore.js / _seoJobsCore.js; the Inngest functions
// just wrap it in a retriable step. Async/prod path; local dev runs the core
// inline (see vite.config.js).
//
// Env (server-side): INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY (+ the generation
// env the cores need). Register the app by pointing Inngest at /api/inngest.
//
// NOTE: Inngest v4 createFunction takes TWO args — config (with a `triggers`
// array) then the handler — NOT the old (config, trigger, handler) form.
// Events use an `mc/` namespace so they can never collide with the separate
// Content Agent app's events, even in a shared Inngest environment.
import { Inngest } from 'inngest'
import { generateDraft, makeServiceClient } from './_seoGenerateCore.js'
import { researchKeyword, runSiteAnalysis, runSeoReport } from './_seoJobsCore.js'

export const inngest = new Inngest({ id: 'mission-control' })

// Draft generation. Concurrency capped per client so one busy client can't
// starve the others.
export const generateContent = inngest.createFunction(
  {
    id: 'generate-content',
    name: 'Generate content draft',
    concurrency: { key: 'event.data.clientId', limit: 5 },
    triggers: [{ event: 'mc/content.generate.requested' }],
  },
  async ({ event, step }) => {
    const { clientId, contentType, topic, draftId, useKnowledgeBase = true } = event.data
    return step.run('generate-draft', () =>
      generateDraft({ env: process.env, clientId, contentType, topic, draftId, useKnowledgeBase }),
    )
  },
)

// On failure, mark the pre-created draft as failed so the UI doesn't spin forever.
export const generateContentFailed = inngest.createFunction(
  {
    id: 'generate-content-failed',
    triggers: [{ event: 'inngest/function.failed', if: "event.data.function_id == 'mission-control-generate-content'" }],
  },
  async ({ event }) => {
    const draftId = event.data?.event?.data?.draftId
    if (!draftId) return { skipped: true }
    const db = makeServiceClient(process.env)
    await db.from('content_drafts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', draftId)
    return { draftId, status: 'failed' }
  },
)

// Keyword research (DataForSEO).
export const keywordResearch = inngest.createFunction(
  {
    id: 'keyword-research',
    concurrency: { key: 'event.data.clientId', limit: 5 },
    triggers: [{ event: 'mc/keyword.research.requested' }],
  },
  async ({ event, step }) =>
    step.run('research', () => researchKeyword({ env: process.env, clientId: event.data.clientId, keyword: event.data.keyword })),
)

// Site analysis (DataForSEO rankings + Claude strategy).
export const siteAnalysis = inngest.createFunction(
  {
    id: 'site-analysis',
    concurrency: { key: 'event.data.clientId', limit: 2 },
    triggers: [{ event: 'mc/site.analysis.requested' }],
  },
  async ({ event, step }) =>
    step.run('analyze', () =>
      runSiteAnalysis({ env: process.env, clientId: event.data.clientId, domain: event.data.domain, analysisId: event.data.analysisId }),
    ),
)

// SEO report (PageSpeed Insights + Claude synthesis).
export const seoReport = inngest.createFunction(
  {
    id: 'seo-report',
    concurrency: { key: 'event.data.clientId', limit: 2 },
    triggers: [{ event: 'mc/seo.report.requested' }],
  },
  async ({ event, step }) =>
    step.run('report', () => runSeoReport({ env: process.env, clientId: event.data.clientId, domain: event.data.domain })),
)

export const functions = [generateContent, generateContentFailed, keywordResearch, siteAnalysis, seoReport]

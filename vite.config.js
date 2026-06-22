import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { generateDraft } from './api/_seoGenerateCore.js'
import { researchKeyword, runSiteAnalysis, runSeoReport } from './api/_seoJobsCore.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env without the VITE_ prefix restriction so the key stays server-side only.
  const env = loadEnv(mode, process.cwd(), '')
  const VISTA_KEY = env.VISTA_SOCIAL_API_KEY || ''
  const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY || ''
  const GHL_KEY = env.GHL_API_KEY || ''
  const GHL_V1 = env.GHL_AUTH_MODE === 'v1'
  // Server-side env the SEO/GEO generation core needs (never reaches the browser).
  const GEN_ENV = {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || '',
    DATAFORSEO_DEFAULT_LOGIN: env.DATAFORSEO_DEFAULT_LOGIN || '',
    DATAFORSEO_DEFAULT_PASSWORD: env.DATAFORSEO_DEFAULT_PASSWORD || '',
    GOOGLE_PSI_KEY: env.GOOGLE_PSI_KEY || '',
  }

  // Dev equivalent of api/seo-generate.js — runs the generation core inline so
  // "Generate draft" works under `npm run dev` without Inngest. Prod uses the
  // serverless function (and optionally the Inngest async path).
  const seoGenerateDevApi = {
    name: 'seo-generate-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/seo-generate', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'method_not_allowed' }))
          return
        }
        try {
          let raw = ''
          for await (const chunk of req) raw += chunk
          const body = raw ? JSON.parse(raw) : {}
          const result = await generateDraft({
            env: GEN_ENV,
            clientId: body.clientId,
            contentType: body.contentType,
            topic: body.topic,
          })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...result, async: false }))
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'generation_failed', message: String(e?.message || e) }))
        }
      })
    },
  }

  // Dev equivalent of api/seo-job.js — runs the SEO job cores inline.
  const seoJobDevApi = {
    name: 'seo-job-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/seo-job', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'method_not_allowed' }))
          return
        }
        try {
          let raw = ''
          for await (const chunk of req) raw += chunk
          const body = raw ? JSON.parse(raw) : {}
          let result
          if (body.action === 'keyword') result = await researchKeyword({ env: GEN_ENV, clientId: body.clientId, keyword: body.keyword })
          else if (body.action === 'site') result = await runSiteAnalysis({ env: GEN_ENV, clientId: body.clientId, domain: body.domain })
          else if (body.action === 'report') result = await runSeoReport({ env: GEN_ENV, clientId: body.clientId, domain: body.domain })
          else throw new Error('unknown action')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...result, async: false }))
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'job_failed', message: String(e?.message || e) }))
        }
      })
    },
  }

  return {
    plugins: [react(), seoGenerateDevApi, seoJobDevApi],
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Browser calls /vista-mcp (same-origin, no CORS); we forward to the Vista
        // Social MCP endpoint and inject the api_key query param server-side so it
        // never reaches the client bundle. The MCP endpoint (JSON-RPC) returns live
        // data with this key, unlike the subscription-gated REST API.
        '/vista-mcp': {
          target: 'https://vistasocial.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) =>
            path.replace(/^\/vista-mcp.*/, '/api/integration/mcp') +
            (VISTA_KEY ? `?api_key=${VISTA_KEY}` : ''),
        },
        // AI generation: browser calls /claude-api; we forward to the Anthropic
        // Messages API and inject the key via headers server-side (the prod
        // equivalent is api/claude.js). Key never reaches the client bundle.
        '/claude-api': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/claude-api.*/, '/v1/messages'),
          headers: {
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
        },
        // GoHighLevel: /ghl-api/<path> forwards with the key injected (prod
        // equivalent: api/ghl.js with a path allowlist).
        '/ghl-api': {
          target: GHL_V1 ? 'https://rest.gohighlevel.com' : 'https://services.leadconnectorhq.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/ghl-api/, GHL_V1 ? '/v1' : ''),
          headers: {
            Authorization: `Bearer ${GHL_KEY}`,
            ...(GHL_V1 ? {} : { Version: '2021-07-28' }),
          },
          // Clients on their own GHL account send their key via x-ghl-key;
          // swap it into Authorization (same behavior as api/ghl.js in prod).
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const own = req.headers['x-ghl-key']
              if (own) {
                proxyReq.setHeader('Authorization', `Bearer ${own}`)
                proxyReq.removeHeader('x-ghl-key')
              }
            })
          },
        },
      },
    },
  }
})

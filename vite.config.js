import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleContentAgent } from './api/_contentAgentCore.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env without the VITE_ prefix restriction so the key stays server-side only.
  const env = loadEnv(mode, process.cwd(), '')
  const VISTA_KEY = env.VISTA_SOCIAL_API_KEY || ''
  const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY || ''
  const GHL_KEY = env.GHL_API_KEY || ''
  const GHL_V1 = env.GHL_AUTH_MODE === 'v1'
  const CA_ENV = {
    CONTENT_AGENT_SUPABASE_URL: env.CONTENT_AGENT_SUPABASE_URL || '',
    CONTENT_AGENT_SERVICE_ROLE_KEY: env.CONTENT_AGENT_SERVICE_ROLE_KEY || '',
  }

  // Dev equivalent of api/content-agent.js — runs the SAME shared core so the
  // service-role key stays server-side and behaviour matches prod.
  const contentAgentDevApi = {
    name: 'content-agent-dev-api',
    configureServer(server) {
      server.middlewares.use('/content-agent-api', async (req, res) => {
        try {
          const u = new URL(req.url, 'http://localhost')
          const params = Object.fromEntries(u.searchParams.entries())
          const { status, body } = await handleContentAgent({
            resource: params.resource || '',
            clientId: params.clientId || '',
            params,
            env: CA_ENV,
          })
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'middleware_failed', message: String(e?.message || e) }))
        }
      })
    },
  }

  return {
    plugins: [react(), contentAgentDevApi],
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

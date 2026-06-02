import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env without the VITE_ prefix restriction so the key stays server-side only.
  const env = loadEnv(mode, process.cwd(), '')
  const VISTA_KEY = env.VISTA_SOCIAL_API_KEY || ''

  return {
    plugins: [react()],
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
      },
    },
  }
})

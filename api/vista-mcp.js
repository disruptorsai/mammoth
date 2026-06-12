// Serverless proxy to the Vista Social MCP endpoint (production).
//
// Mirrors the Vite dev proxy: injects the api_key server-side so it never
// reaches the browser, and avoids CORS. The browser POSTs JSON-RPC to
// /api/vista-mcp; we forward it to Vista Social.
//
// SAFETY: this endpoint is public (the app has no auth yet), so we only allow
// read-only MCP tools. Write/mutating tools (createOrUpdatePost, inboxAction,
// sendEmail, createUser, …) are rejected so a stranger who finds the URL can't
// post to or modify the connected client accounts.

const READ_TOOLS = new Set([
  'findProfiles', 'findProfileGroups', 'searchProfileGroups', 'listNetworks',
  'whoami', 'listUsers', 'listPosts', 'getPost', 'listPostComments',
  'getProfileMetrics', 'getPublishedPostPerformance', 'getSentimentReport',
  'getIndustryBenchmark', 'getInboxStats', 'listInboxItems', 'getProfileQueues',
  'getOptimalPublishTimes', 'listTasks', 'getDevices', 'listMacros',
  'listWorkflows', 'listBoostConfigurations', 'getVistaPages', 'listIdeas',
  'listExternalCalendars', 'listTimezones', 'getVistaHelp',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.VISTA_SOCIAL_API_KEY
  if (!key) {
    res.status(500).json({ error: 'Server is not configured (missing VISTA_SOCIAL_API_KEY).' })
    return
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : safeParse(req.body)

  // Block any non-read tool call.
  if (payload?.method === 'tools/call' && !READ_TOOLS.has(payload?.params?.name)) {
    res.status(403).json({
      jsonrpc: '2.0',
      id: payload?.id ?? null,
      error: { code: -32001, message: `Tool "${payload?.params?.name}" is not allowed on this public endpoint.` },
    })
    return
  }

  try {
    const upstream = await fetch(`https://vistasocial.com/api/integration/mcp?api_key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify(payload),
    })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(text)
  } catch {
    res.status(502).json({ error: 'Could not reach Vista Social.' })
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

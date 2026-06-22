// Vercel serverless endpoint that serves the Inngest functions (prod async
// path). Register this URL in your Inngest account: https://<deployment>/api/inngest.
// Local dev runs generation inline instead (vite.config.js), so this isn't needed
// under `npm run dev`.
//
// Use the `inngest/node` serve (NOT inngest/express): it targets the standard
// Node (req, res) handler signature that Vercel's serverless functions use, and
// reads the raw request body itself — the express handler crashes on Vercel
// (FUNCTION_INVOCATION_FAILED) and breaks signature verification.
import { serve } from 'inngest/node'
import { inngest, functions } from './_inngestApp.js'

export default serve({ client: inngest, functions })

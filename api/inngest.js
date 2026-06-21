// Vercel serverless endpoint that serves the Inngest functions (prod async
// path). Register this URL in your Inngest account: https://<deployment>/api/inngest.
// Local dev runs generation inline instead (vite.config.js), so this isn't needed
// under `npm run dev`.
import { serve } from 'inngest/express'
import { inngest, functions } from './_inngestApp.js'

export default serve({ client: inngest, functions })

// Generate a hero/featured image for a content draft on demand (from the Draft
// Editor) and attach it to the draft. The image is created with OpenAI
// (gpt-image-1) and uploaded to the main site's public blog-images bucket, so
// the stored value is a clean public URL — the same one the publish flow reuses
// as `featured_image`. Scoped to the main-site client (disruptors-media).
//
// Env: OPENAI_API_KEY, MAIN_SITE_SUPABASE_URL, MAIN_SITE_SUPABASE_SERVICE_ROLE_KEY,
//      VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: MAIN_SITE_CLIENT_ID,
//      MAIN_SITE_IMAGE_BUCKET.
import { makeServiceClient } from './_seoGenerateCore.js'
import { makeMainSiteClient, generateAndUploadImage, buildImagePrompt } from './_publishMainSiteCore.js'

const DEFAULT_CLIENT_ID = 'disruptors-media'

export async function generateDraftImage({ env, draftId, prompt }) {
  if (!draftId) throw new Error('draftId is required')
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server.')
  const allowedClient = env.MAIN_SITE_CLIENT_ID || DEFAULT_CLIENT_ID

  const mc = makeServiceClient(env) // Mammoth DB
  const site = makeMainSiteClient(env) // main-site storage

  const { data: draft, error } = await mc.from('content_drafts').select('*').eq('id', draftId).single()
  if (error) throw error
  if (!draft) throw new Error('Draft not found.')
  if (draft.client_id !== allowedClient)
    throw new Error(`Only "${allowedClient}" drafts support main-site image generation.`)

  const finalPrompt = (prompt && prompt.trim()) || buildImagePrompt(draft)
  // Stable per-draft path so regenerating overwrites rather than piling up.
  const url = await generateAndUploadImage({ env, site, prompt: finalPrompt, path: `generated/draft-${draftId}.png` })
  if (!url) throw new Error('Image generation failed.')

  // Cache-bust: the path is reused on regenerate, so version the URL to defeat
  // CDN/browser caching of the previous image.
  const versioned = `${url}?v=${Date.now()}`
  const { error: uErr } = await mc
    .from('content_drafts')
    .update({ image_storage_path: versioned, updated_at: new Date().toISOString() })
    .eq('id', draftId)
  if (uErr) throw uErr

  return { url: versioned }
}

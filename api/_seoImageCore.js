// AI image generation core (OpenAI gpt-image-1). Server-side; returns a base64
// data URL the client persists into client_images. Env: OPENAI_API_KEY.
export async function generateImage({ env, prompt }) {
  const key = env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured on the server.')
  if (!prompt || !prompt.trim()) throw new Error('prompt is required')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: prompt.trim(), n: 1, size: '1024x1024' }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`)
  const json = JSON.parse(text)
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('No image returned')
  return { dataUrl: `data:image/png;base64,${b64}` }
}

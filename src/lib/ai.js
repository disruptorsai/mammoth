import { supabase, isSupabaseConfigured } from './supabase'

// AI generation via the same-origin /claude-api proxy (dev: vite.config.js,
// prod: api/claude.js). The Anthropic key is injected server-side — this module
// only builds Messages API request bodies and parses responses.

const ENDPOINT = '/claude-api'
const MODEL = 'claude-opus-4-8'

export class AiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'AiError'
    this.status = status
  }
}

async function complete({ system, prompt, maxTokens = 1024 }) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    throw new AiError('Could not reach the AI service.', 0)
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new AiError(`AI request failed (${res.status}).`, res.status)
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `AI request failed (${res.status}).`
    throw new AiError(typeof msg === 'string' ? msg : JSON.stringify(msg), res.status)
  }

  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) throw new AiError('The AI returned an empty response.', res.status)

  return { text, usage: data.usage || {}, model: data.model || MODEL }
}

// Append a usage row (best-effort — generation result is not blocked on it).
async function logUsage(clientId, kind, { usage, model }) {
  if (!isSupabaseConfigured || !clientId) return
  try {
    await supabase.from('usage_events').insert({
      client_id: clientId,
      kind,
      model,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    })
  } catch {
    /* metering is best-effort */
  }
}

export async function generateAdCopy({ clientId, clientName, platform, tone, brief }) {
  const result = await complete({
    system:
      'You are a senior direct-response copywriter at a marketing agency. ' +
      'Respond only with the finished ad copy — no preamble, no explanations, no options list. ' +
      'Write a headline on the first line, then the body copy, then a one-line CTA.',
    prompt:
      `Write ${tone.toLowerCase()} ad copy for ${platform}.\n` +
      `Client: ${clientName}.\n` +
      `Brief: ${brief}`,
    maxTokens: 1024,
  })
  logUsage(clientId, 'ad_copy', result)
  return result
}

export async function generateCaption({ clientId, clientName, channel, topic, toneNotes }) {
  const result = await complete({
    system:
      'You are a social media manager at a marketing agency. ' +
      'Respond only with the finished caption — no preamble, no options, no explanations. ' +
      'Include 3-5 relevant hashtags on the final line.',
    prompt:
      `Write a ${channel} caption for ${clientName}.\n` +
      `Topic: ${topic}` +
      (toneNotes ? `\nTone/notes: ${toneNotes}` : ''),
    maxTokens: 1024,
  })
  logUsage(clientId, 'caption', result)
  return result
}

// Sum of this calendar month's usage for a client (for the Subscription card).
export async function fetchMonthUsage(clientId) {
  if (!isSupabaseConfigured || !clientId) return { total: 0, events: 0 }
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('usage_events')
    .select('input_tokens, output_tokens')
    .eq('client_id', clientId)
    .gte('created_at', start.toISOString())
  if (error) throw error
  const rows = data ?? []
  return {
    total: rows.reduce((a, r) => a + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
    events: rows.length,
  }
}

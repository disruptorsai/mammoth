import { supabase, isSupabaseConfigured } from './supabase'
import { LEAD_STAGES, positionBetween } from './leads'
import { updateClient } from './clients'

// GoHighLevel client — all calls go through the same-origin /ghl-api proxy
// (dev: vite.config.js, prod: api/ghl.js). The API key stays server-side.
// Sync is READ-ONLY: GHL opportunities are upserted into the local `leads`
// table (source='ghl', keyed by external_id); dragging a synced lead locally
// does not write back to GHL.

export class GhlError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GhlError'
    this.status = status
  }
}

async function ghlGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  let res
  try {
    res = await fetch(`/ghl-api/${path}${qs ? `?${qs}` : ''}`)
  } catch {
    throw new GhlError('Could not reach GoHighLevel.', 0)
  }
  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `GoHighLevel request failed (${res.status}).`
    throw new GhlError(typeof msg === 'string' ? msg : JSON.stringify(msg), res.status)
  }
  return data
}

// Cheap connectivity check for a location.
export async function pingGhl(locationId) {
  try {
    await ghlGet(`locations/${locationId}`)
    return true
  } catch {
    return false
  }
}

export async function fetchPipelines(locationId) {
  const data = await ghlGet('opportunities/pipelines', { locationId })
  return Array.isArray(data?.pipelines) ? data.pipelines : []
}

export async function fetchOpportunities(locationId) {
  const data = await ghlGet('opportunities/search', { location_id: locationId, limit: 100 })
  return Array.isArray(data?.opportunities) ? data.opportunities : []
}

// Map a GHL opportunity to one of our 4 local stages: 'won' status lands in
// contract; otherwise by the stage's relative position within its pipeline.
function mapStage(opp, pipelineStageIndex) {
  if (String(opp.status || '').toLowerCase() === 'won') return 'contract'
  const info = pipelineStageIndex.get(opp.pipelineStageId)
  if (!info || info.total <= 1) return 'new'
  const quartile = Math.min(3, Math.floor((info.index / info.total) * LEAD_STAGES.length))
  return LEAD_STAGES[quartile].key
}

// Pull the client's GHL pipeline into the local leads table. Returns counts.
export async function syncLeadsFromGhl(client) {
  if (!isSupabaseConfigured) throw new GhlError('Supabase is not configured.', 0)
  const locationId = client.ghlLocationId
  if (!locationId) throw new GhlError('No GHL location id set for this client.', 0)

  const [pipelines, opportunities] = await Promise.all([
    fetchPipelines(locationId),
    fetchOpportunities(locationId),
  ])

  // stage id -> { index, total } within its pipeline
  const pipelineStageIndex = new Map()
  for (const p of pipelines) {
    const stages = Array.isArray(p.stages) ? p.stages : []
    stages.forEach((s, i) => pipelineStageIndex.set(s.id, { index: i, total: stages.length }))
  }

  // Existing synced leads for this client, by external id.
  const { data: existingRows, error: exErr } = await supabase
    .from('leads')
    .select('id, external_id, stage_key, position')
    .eq('client_id', client.id)
    .eq('source', 'ghl')
  if (exErr) throw exErr
  const existing = new Map((existingRows ?? []).map((r) => [r.external_id, r]))

  // Track the max position per stage so new cards append at the end.
  const { data: allRows } = await supabase
    .from('leads')
    .select('stage_key, position')
    .eq('client_id', client.id)
  const maxPos = {}
  for (const r of allRows ?? []) {
    maxPos[r.stage_key] = Math.max(maxPos[r.stage_key] ?? 0, r.position)
  }

  let created = 0
  let updated = 0
  for (const opp of opportunities) {
    const externalId = String(opp.id)
    const fields = {
      name: opp.contact?.name || opp.name || 'Unnamed lead',
      company: opp.name && opp.contact?.name ? opp.name : '',
      value: Number(opp.monetaryValue || 0),
      stage_key: mapStage(opp, pipelineStageIndex),
    }
    const prior = existing.get(externalId)
    if (prior) {
      const { error } = await supabase.from('leads').update(fields).eq('id', prior.id)
      if (error) throw error
      updated++
    } else {
      const position = positionBetween(maxPos[fields.stage_key] ?? null, null)
      maxPos[fields.stage_key] = position
      const { error } = await supabase.from('leads').insert({
        client_id: client.id,
        source: 'ghl',
        external_id: externalId,
        position,
        ...fields,
      })
      if (error) throw error
      created++
    }
  }

  await updateClient(client.id, { ghl_last_synced_at: new Date().toISOString() })
  return { created, updated, total: opportunities.length }
}

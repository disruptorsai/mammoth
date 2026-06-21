import { supabase, isSupabaseConfigured } from './supabase'

function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials || row.name.slice(0, 2).toUpperCase(),
    health: row.health ?? 75,
    features: row.features ?? { internal: true },
    // Link to the matching client in the Content Agent (SEO/GEO) app, if set.
    // Stored inside the features jsonb so no schema migration is required.
    contentAgentClientId: row.features?.contentAgentClientId ?? null,
    billingEmail: row.billing_email ?? '',
    phone: row.phone ?? '',
    plan: row.plan ?? null,
    vistaGroupId: row.vista_group_id ?? null,
    ghlLocationId: row.ghl_location_id ?? '',
    ghlLastSyncedAt: row.ghl_last_synced_at ?? null,
  }
}

// slug id from a name: "Acme Dental" -> "acme-dental".
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Two-letter initials from a name: "Acme Dental" -> "AD".
export function initialsFrom(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export async function fetchClients() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function createClient({ id, name, initials, health, features }) {
  const { data, error } = await supabase
    .from('clients')
    .insert({ id, name, initials, health, features })
    .select()
    .single()
  if (error) throw error
  return normalize(data)
}

// Link (or unlink, pass null) a Mammoth client to a Content Agent client UUID.
// Persisted in the features jsonb to avoid a schema migration. Admin-only
// (the clients UPDATE policy is admin-scoped server-side).
export async function setContentAgentLink(client, contentAgentClientId) {
  const features = { ...(client.features ?? { internal: true }) }
  if (contentAgentClientId) features.contentAgentClientId = contentAgentClientId
  else delete features.contentAgentClientId
  return updateClient(client.id, { features })
}

// Delete a client and ALL their data in OUR database (admin-only, enforced in
// the delete_client() SQL function). Never touches external services like GHL.
export async function deleteClient(id) {
  const { error } = await supabase.rpc('delete_client', { p_client_id: id })
  if (error) throw error
}

// Update client fields. Accepts DB column names (e.g. billing_email, phone, plan).
export async function updateClient(id, fields) {
  const { data, error } = await supabase
    .from('clients')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return normalize(data)
}

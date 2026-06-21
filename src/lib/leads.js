import { supabase, isSupabaseConfigured } from './supabase'

// Reuse the fractional-ordering helper from the task board.
export { positionBetween } from './tasks'

// CRM pipeline stages. `key` matches the DB stage_key check constraint.
export const LEAD_STAGES = [
  { key: 'new', title: 'New Inquiry' },
  { key: 'qualified', title: 'Qualified' },
  { key: 'proposal', title: 'Proposal' },
  { key: 'contract', title: 'Contract' },
]

export async function fetchLeads(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('client_id', clientId)
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createLead(clientId, stageKey, fields, position) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ client_id: clientId, stage_key: stageKey, position, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLead(id, fields) {
  const { data, error } = await supabase
    .from('leads')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ---- Interactions (lead_activities) -----------------------------------------

export const ACTIVITY_KINDS = [
  { key: 'note', label: 'Note', icon: 'sticky_note_2' },
  { key: 'email', label: 'Email', icon: 'mail' },
  { key: 'call', label: 'Call', icon: 'call' },
  { key: 'meeting', label: 'Meeting', icon: 'groups' },
]

// Latest interactions for the whole client (the CRM "Interaction Stream").
export async function fetchClientActivities(clientId, limit = 20) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*, leads(name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function addLeadActivity(lead, kind, body) {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({ lead_id: lead.id, client_id: lead.client_id, kind, body })
    .select()
    .single()
  if (error) throw error
  return data
}

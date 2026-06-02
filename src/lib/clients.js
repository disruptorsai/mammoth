import { supabase, isSupabaseConfigured } from './supabase'

function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials || row.name.slice(0, 2).toUpperCase(),
    health: row.health ?? 75,
    features: row.features ?? { internal: true },
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

import { supabase, isSupabaseConfigured } from './supabase'

export async function fetchKeywords(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createKeyword(clientId, fields) {
  const { data, error } = await supabase
    .from('seo_keywords')
    .insert({ client_id: clientId, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteKeyword(id) {
  const { error } = await supabase.from('seo_keywords').delete().eq('id', id)
  if (error) throw error
}

import { supabase, isSupabaseConfigured } from './supabase'

// Reuse the fractional-ordering helper from the task board.
export { positionBetween } from './tasks'

// Content pipeline columns. `key` matches the DB column_key check constraint.
export const CONTENT_COLUMNS = [
  { key: 'idea', title: 'Idea' },
  { key: 'drafting', title: 'Drafting' },
  { key: 'scheduled', title: 'Scheduled' },
  { key: 'published', title: 'Published' },
]

export async function fetchContentPosts(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('client_id', clientId)
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createContentPost(clientId, columnKey, fields, position) {
  const { data, error } = await supabase
    .from('content_posts')
    .insert({ client_id: clientId, column_key: columnKey, position, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContentPost(id, fields) {
  const { data, error } = await supabase
    .from('content_posts')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContentPost(id) {
  const { error } = await supabase.from('content_posts').delete().eq('id', id)
  if (error) throw error
}

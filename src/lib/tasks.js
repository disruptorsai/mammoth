import { supabase, isSupabaseConfigured } from './supabase'

// The three board columns. `key` matches the DB `column_key` check constraint.
export const BOARD_COLUMNS = [
  { key: 'todo', title: 'To-Do' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
]

const STEP = 1024 // default gap between positions, leaves room to insert between

// Compute a fractional position that sorts between two neighbors. `before`/`after`
// are the position values of the cards on either side of the drop slot (or null at
// the ends). This lets us reposition a single card without renumbering the column.
export function positionBetween(before, after) {
  if (before == null && after == null) return STEP
  if (before == null) return after - STEP
  if (after == null) return before + STEP
  return (before + after) / 2
}

// Load every task for a client, ordered for display. Returns [] if Supabase
// isn't configured so the board still renders (empty) in a fresh checkout.
export async function fetchTasks(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTask(clientId, columnKey, fields, position) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ client_id: clientId, column_key: columnKey, position, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id, fields) {
  const { data, error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

import { createClient } from '@supabase/supabase-js'

// Single shared Supabase client, configured from Vite env vars (see .env.example).
// Anon key only — public tables for now, no auth (locked down later).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// `isSupabaseConfigured` lets the UI degrade gracefully (show a hint) instead of
// throwing a blank screen when env vars are missing in a fresh checkout.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

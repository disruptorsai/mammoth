import { supabase, isSupabaseConfigured } from './supabase'

export const PLATFORMS = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'other', label: 'Other' },
]

export const CAMPAIGN_STATUSES = [
  { key: 'draft', label: 'Draft' },
  { key: 'active', label: 'Active' },
  { key: 'learning', label: 'Learning' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
]

export async function fetchCampaigns(clientId) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCampaign(clientId, fields) {
  const { data, error } = await supabase
    .from('ad_campaigns')
    .insert({ client_id: clientId, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCampaign(id, fields) {
  const { data, error } = await supabase
    .from('ad_campaigns')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCampaign(id) {
  const { error } = await supabase.from('ad_campaigns').delete().eq('id', id)
  if (error) throw error
}

// Aggregate campaign rows into overview metrics. Derived ratios are null when
// the denominator is 0 — the UI renders "—" rather than a fake number.
export function aggregateCampaigns(rows) {
  const sum = (k) => rows.reduce((acc, r) => acc + Number(r[k] || 0), 0)
  const spend = sum('spend')
  const impressions = sum('impressions')
  const clicks = sum('clicks')
  const conversions = sum('conversions')
  const revenue = sum('revenue')
  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    roas: spend > 0 && revenue > 0 ? revenue / spend : null,
    cpa: conversions > 0 ? spend / conversions : null,
  }
}

// Spend share per platform, for the cross-channel bars. Only returns platforms
// that actually have spend.
export function spendByPlatform(rows) {
  const totals = new Map()
  for (const r of rows) {
    const key = r.platform || 'other'
    totals.set(key, (totals.get(key) || 0) + Number(r.spend || 0))
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, value]) => ({
      platform,
      value,
      share: grand > 0 ? value / grand : 0,
    }))
}

export function formatMoney(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

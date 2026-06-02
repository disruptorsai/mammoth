// Vista Social client — talks to the Vista Social MCP endpoint (JSON-RPC over HTTP).
//
// All calls go through the same-origin /vista-mcp proxy (see vite.config.js), which
// injects the api_key query param server-side. That avoids CORS and keeps the key
// out of the browser bundle.
//
// Why MCP and not the REST API: the REST /api/integration/* endpoints are gated
// ("Your subscription does not offer API access"), but the MCP endpoint returns
// live data with the same key — and exposes far more (analytics, posts, inbox…).

const ENDPOINT = '/vista-mcp'
let _id = 0

export class VistaError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'VistaError'
    this.status = status
  }
}

// Calls a single MCP tool and returns its parsed result.
// MCP tools wrap their payload as { content: [{ type: 'text', text: '<json>' }] }.
export async function callTool(name, args = {}) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++_id,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    })
  } catch {
    throw new VistaError('Could not reach Vista Social.', 0)
  }

  if (!res.ok) {
    throw new VistaError(`Vista Social request failed (${res.status}).`, res.status)
  }

  const envelope = await res.json()
  if (envelope.error) {
    throw new VistaError(envelope.error.message || 'Vista Social MCP error.', res.status)
  }

  const block = envelope.result?.content?.[0]
  const text = block?.text ?? ''

  // Tool-level errors come back as a normal result with isError:true, and the
  // text is a plain message ("MCP error …", "Error …") rather than JSON.
  if (
    envelope.result?.isError ||
    (typeof text === 'string' && /^(MCP error|Error)\b/i.test(text))
  ) {
    throw new VistaError(String(text).split('\n')[0], res.status)
  }

  if (!text) return envelope.result ?? null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// --- Domain calls -----------------------------------------------------------

// findProfiles returns names like "Disruptors Media (Instagram Profile)" — split
// the trailing parenthetical into a clean display name + a network string that
// networkStyle() can match.
function normalizeProfile(p) {
  const m = /^(.*?)\s*\(([^]*)\)\s*$/.exec(p.name || '')
  return {
    id: p.id,
    name: m ? m[1].trim() : p.name,
    network: m ? m[2].trim() : p.network || '',
  }
}

// Connected social profiles, normalized to { id, name, network }.
export async function getProfiles({ limit = 100 } = {}) {
  const raw = await callTool('findProfiles', { limit })
  return (Array.isArray(raw) ? raw : []).map(normalizeProfile)
}

// Client/brand groups, e.g. { profile_group_id, name, type, timezone }.
export async function getProfileGroups() {
  const raw = await callTool('findProfileGroups', {})
  return Array.isArray(raw) ? raw : []
}

// The full client tree: every profile group with its profiles nested under it.
// One findProfileGroups call + one findProfiles call per group (parallel).
// Returns [{ id, name, type, profiles: [{ id, name, network }] }].
export async function getGroupedProfiles() {
  const groups = await getProfileGroups()
  const withProfiles = await Promise.all(
    groups.map(async (g) => {
      const raw = await callTool('findProfiles', {
        profile_group_id: g.profile_group_id,
        fields: ['id', 'name', 'network'],
        limit: 100,
      })
      return {
        id: g.profile_group_id,
        name: g.name,
        type: g.type,
        profiles: (Array.isArray(raw) ? raw : []).map(normalizeProfile),
      }
    }),
  )
  // Agency group first, then clients alphabetically — matches Vista's ordering.
  return withProfiles.sort((a, b) => {
    if (a.type === 'AGENCY' && b.type !== 'AGENCY') return -1
    if (b.type === 'AGENCY' && a.type !== 'AGENCY') return 1
    return a.name.localeCompare(b.name)
  })
}

// All post statuses worth showing on a calendar (Vista's enum values are uppercase).
export const POST_STATUSES = [
  'SCHEDULED',
  'APPROVED',
  'PUBLISHED',
  'IN_REVIEW',
  'REVIEW',
  'DRAFT',
  'PROCESSING',
  'FAILED',
  'REJECTED',
]

// Posts from the publishing calendar, normalized to plain objects.
// status + profile_ids are required by the API (filter mode). listPosts returns
// a { columns, rows } table in compact mode — we zip it back into objects.
export async function listPosts({
  profileIds,
  dateFrom,
  dateTo,
  status = POST_STATUSES,
  limit = 500, // API max
  timezone,
} = {}) {
  if (!profileIds?.length) return []
  const res = await callTool('listPosts', {
    status,
    profile_ids: profileIds,
    dateFrom,
    dateTo,
    limit,
    response_mode: 'compact',
    include_full_message: false,
    ...(timezone ? { timezone } : {}),
  })

  const columns = res?.columns
  const rows = res?.rows
  if (!Array.isArray(columns) || !Array.isArray(rows)) return []

  const idx = Object.fromEntries(columns.map((c, i) => [c, i]))
  return rows.map((r) => ({
    id: r[idx.id],
    type: r[idx.type],
    profileId: r[idx.profile_id],
    network: r[idx.network],
    status: r[idx.status],
    statusLabel: r[idx.status_label],
    // "2026-02-10T01:04" in the requested timezone — first 10 chars = the day.
    publishAt: r[idx.publish_at],
    day: typeof r[idx.publish_at] === 'string' ? r[idx.publish_at].slice(0, 10) : null,
    publishAtFormatted: r[idx.publish_at_formatted],
    message: r[idx.message] || '',
    publishedLink: r[idx.published_link],
    internalLink: r[idx.internal_link],
    mediaCounts: r[idx.media_counts] || {},
  }))
}

// Status → pill color classes (matches Vista's calendar semantics).
const STATUS_STYLES = {
  PUBLISHED: { dot: 'bg-green-500', text: 'text-green-400', label: 'Published' },
  SCHEDULED: { dot: 'bg-primary', text: 'text-primary', label: 'Scheduled' },
  APPROVED: { dot: 'bg-primary', text: 'text-primary', label: 'Scheduled' },
  IN_REVIEW: { dot: 'bg-blue-400', text: 'text-blue-400', label: 'In review' },
  REVIEW: { dot: 'bg-blue-400', text: 'text-blue-400', label: 'In review' },
  DRAFT: { dot: 'bg-on-surface-variant', text: 'text-on-surface-variant', label: 'Draft' },
  PROCESSING: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Processing' },
  FAILED: { dot: 'bg-red-500', text: 'text-red-400', label: 'Failed' },
  REJECTED: { dot: 'bg-red-500', text: 'text-red-400', label: 'Rejected' },
}

export function statusStyle(status) {
  return (
    STATUS_STYLES[String(status || '').toUpperCase()] || {
      dot: 'bg-on-surface-variant',
      text: 'text-on-surface-variant',
      label: status || 'Unknown',
    }
  )
}

// --- Network presentation helpers -------------------------------------------
// Maps a network string to a Material Symbol + brand color so the UI doesn't
// hardcode any channels.

const NETWORK_STYLES = {
  facebook: { icon: 'thumb_up', bg: 'bg-[#1877F2]', label: 'Facebook' },
  instagram: {
    icon: 'photo_camera',
    bg: 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600',
    label: 'Instagram',
  },
  linkedin: { icon: 'work', bg: 'bg-[#0A66C2]', label: 'LinkedIn' },
  twitter: { icon: 'tag', bg: 'bg-black', label: 'Twitter/X', short: 'X' },
  x: { icon: 'tag', bg: 'bg-black', label: 'Twitter/X', short: 'X' },
  youtube: { icon: 'play_circle', bg: 'bg-[#FF0000]', label: 'YouTube' },
  tiktok: { icon: 'music_note', bg: 'bg-black', label: 'TikTok' },
  pinterest: { icon: 'push_pin', bg: 'bg-[#E60023]', label: 'Pinterest' },
  threads: { icon: 'alternate_email', bg: 'bg-black', label: 'Threads' },
  bluesky: { icon: 'cloud', bg: 'bg-[#0085FF]', label: 'Bluesky' },
  google: { icon: 'storefront', bg: 'bg-[#4285F4]', label: 'Google Business' },
  reddit: { icon: 'forum', bg: 'bg-[#FF4500]', label: 'Reddit' },
  snapchat: { icon: 'photo_camera', bg: 'bg-[#FFFC00]', label: 'Snapchat' },
}

export function networkStyle(network) {
  const key = String(network || '').toLowerCase().replace(/[^a-z]/g, '')
  // "twitter" before "x" so "x (twitter) profile" maps to the Twitter style.
  const found =
    NETWORK_STYLES[key] ||
    (key.includes('twitter') && NETWORK_STYLES.twitter) ||
    Object.entries(NETWORK_STYLES).find(([k]) => key.includes(k))?.[1]
  return found || { icon: 'public', bg: 'bg-surface-variant', label: network || 'Channel' }
}

import { getGroupedProfiles, listPosts } from './vistaSocial'

// Per-client social metrics derived from Vista Social posts. Only countable,
// real numbers — engagement/reach are not exposed by the MCP tools we use, so
// they are not shown at all (no fake percentages).

const pad = (n) => String(n).padStart(2, '0')
export function isoDaysFromToday(offset) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Find the Vista profile group for a client: explicit vista_group_id first,
// then case-insensitive name match. Returns the group or null (not linked).
export function resolveClientGroup(client, groups) {
  if (!client || !Array.isArray(groups)) return null
  if (client.vistaGroupId != null) {
    const byId = groups.find((g) => String(g.id) === String(client.vistaGroupId))
    if (byId) return byId
  }
  const name = client.name?.trim().toLowerCase()
  if (!name) return null
  return groups.find((g) => g.name?.trim().toLowerCase() === name) ?? null
}

// Posts-per-day series over the trailing `days` window (oldest → newest).
export function postsPerDay(posts, days) {
  const counts = new Map()
  for (let i = days - 1; i >= 0; i--) counts.set(isoDaysFromToday(-i), 0)
  for (const p of posts) {
    if (p.day && counts.has(p.day)) counts.set(p.day, counts.get(p.day) + 1)
  }
  return [...counts.entries()].map(([day, count]) => ({ day, count }))
}

// One round-trip snapshot of a client's social activity.
// Returns { linked, group, profiles, posts, stats } — `linked:false` means the
// client has no matching Vista group (UI shows "not linked", never zeros
// pretending to be data).
export async function getClientSocialSnapshot(client, { windowDays = 30 } = {}) {
  const groups = await getGroupedProfiles()
  const group = resolveClientGroup(client, groups)
  if (!group || !group.profiles?.length) {
    return { linked: false, group: null, profiles: [], posts: [], stats: null }
  }

  const profileIds = group.profiles.map((p) => p.id)
  // One window covering [‑windowDays, +windowDays] picks up recent published
  // posts AND upcoming scheduled ones in a single call.
  const posts = await listPosts({
    profileIds,
    dateFrom: isoDaysFromToday(-windowDays),
    dateTo: isoDaysFromToday(windowDays),
  })

  const today = isoDaysFromToday(0)
  const weekAgo = isoDaysFromToday(-7)
  const twoWeeksAgo = isoDaysFromToday(-14)
  const up = (s) => String(s || '').toUpperCase()

  const published = posts.filter((p) => up(p.status) === 'PUBLISHED')
  const scheduledUpcoming = posts.filter(
    (p) => ['SCHEDULED', 'APPROVED'].includes(up(p.status)) && p.day >= today,
  )
  const inReviewOrDraft = posts.filter((p) =>
    ['IN_REVIEW', 'REVIEW', 'DRAFT'].includes(up(p.status)),
  )
  const thisWeek = posts.filter((p) => p.day >= weekAgo && p.day <= today)
  const prevWeek = posts.filter((p) => p.day >= twoWeeksAgo && p.day < weekAgo)

  return {
    linked: true,
    group,
    profiles: group.profiles,
    posts,
    stats: {
      published30: published.length,
      scheduledUpcoming: scheduledUpcoming.length,
      inReviewOrDraft: inReviewOrDraft.length,
      postsThisWeek: thisWeek.length,
      postsPrevWeek: prevWeek.length,
    },
  }
}

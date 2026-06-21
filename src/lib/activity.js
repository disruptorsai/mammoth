import { fetchTasks } from './tasks'
import { fetchContentPosts } from './contentBoard'

// Recent activity for a client, derived from the latest-updated tasks and
// content posts (no separate events table). Shared by the Overview activity
// feed and the notifications bell.
export async function fetchRecentActivity(clientId, limit = 6) {
  if (!clientId) return []
  const [tasks, posts] = await Promise.all([
    fetchTasks(clientId).catch(() => []),
    fetchContentPosts(clientId).catch(() => []),
  ])
  return [
    ...tasks.map((t) => ({
      id: 't-' + t.id,
      icon: 'assignment',
      label: t.title,
      sub: 'Task',
      detail: t.column_key,
      at: t.updated_at,
    })),
    ...posts.map((p) => ({
      id: 'c-' + p.id,
      icon: 'share',
      label: p.title,
      sub: 'Content',
      detail: p.column_key,
      at: p.updated_at,
    })),
  ]
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    .slice(0, limit)
}

// "12m ago" style relative time.
export function relTime(iso) {
  if (!iso) return ''
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

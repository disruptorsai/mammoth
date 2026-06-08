import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useClient } from '../context/ClientContext'
import { fetchTasks } from '../lib/tasks'
import { fetchContentPosts } from '../lib/contentBoard'

function relTime(iso) {
  if (!iso) return ''
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

// Bell menu: the active client's most recently updated tasks + content posts.
export default function NotificationsMenu() {
  const { activeClient } = useClient()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [state, setState] = useState('idle')
  const [read, setRead] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function load() {
    if (!activeClient?.id) {
      setItems([])
      setState('ready')
      return
    }
    setState('loading')
    try {
      const [tasks, posts] = await Promise.all([
        fetchTasks(activeClient.id).catch(() => []),
        fetchContentPosts(activeClient.id).catch(() => []),
      ])
      const merged = [
        ...tasks.map((t) => ({ id: 't-' + t.id, icon: 'assignment', label: t.title, sub: 'Task', at: t.updated_at })),
        ...posts.map((p) => ({ id: 'c-' + p.id, icon: 'share', label: p.title, sub: 'Content', at: p.updated_at })),
      ]
        .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
        .slice(0, 6)
      setItems(merged)
      setState('ready')
    } catch {
      setState('error')
    }
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      setRead(true)
      load()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative text-on-surface-variant hover:text-primary transition-colors"
        aria-label="Notifications"
      >
        <Icon name="notifications" />
        {!read && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          <div className="px-4 py-3 border-b border-outline flex items-center justify-between gap-2">
            <span className="text-sm font-bold">Notifications</span>
            <span className="text-[10px] font-label-mono text-on-surface-variant uppercase truncate">
              {activeClient.name}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {state === 'loading' && (
              <p className="px-4 py-6 text-center text-xs text-on-surface-variant">Loading…</p>
            )}
            {state === 'ready' && items.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-on-surface-variant">No recent activity.</p>
            )}
            {state === 'error' && (
              <p className="px-4 py-6 text-center text-xs text-on-surface-variant">Couldn’t load activity.</p>
            )}
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-outline/40 last:border-0"
              >
                <Icon name={it.icon} className="text-base text-primary mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{it.label || '(untitled)'}</p>
                  <p className="text-[10px] font-label-mono text-on-surface-variant uppercase">
                    {it.sub} · {relTime(it.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useClient } from '../context/ClientContext'
import { fetchRecentActivity, relTime } from '../lib/activity'

// Timestamp (ms) the user last opened the bell, per client — persisted so the
// "unread" dot survives page navigation instead of reappearing every mount.
const seenKey = (id) => `mc.notif.seen.${id}`
const atMs = (v) => new Date(v).getTime() || 0

// Bell menu: the active client's most recently updated tasks + content posts.
export default function NotificationsMenu() {
  const { activeClient } = useClient()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [state, setState] = useState('idle')
  const [hasUnread, setHasUnread] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const load = useCallback(async () => {
    if (!activeClient?.id) {
      setItems([])
      setState('ready')
      setHasUnread(false)
      return
    }
    setState('loading')
    try {
      const rows = await fetchRecentActivity(activeClient.id, 6)
      setItems(rows)
      setState('ready')
      const seen = Number(localStorage.getItem(seenKey(activeClient.id)) || 0)
      const newest = rows.reduce((m, r) => Math.max(m, atMs(r.at)), 0)
      setHasUnread(newest > seen)
    } catch {
      setState('error')
    }
  }, [activeClient?.id])

  // Compute the unread state up front (without opening) so the dot reflects
  // real activity, and re-checks when the active client changes.
  useEffect(() => {
    load()
  }, [load])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      if (activeClient?.id) localStorage.setItem(seenKey(activeClient.id), String(Date.now()))
      setHasUnread(false)
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
        {hasUnread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />}
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

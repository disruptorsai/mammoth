import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { NAV_ITEMS } from '../data/nav'
import { useClient } from '../context/ClientContext'

// Top-bar quick search: jump to a page, or (admins) switch to a client. Instant,
// in-memory — no async. Tasks/content are searched on their own pages.
export default function GlobalSearch({ placeholder = 'Global Search…' }) {
  const navigate = useNavigate()
  const { clients, setActiveClient, canSwitch } = useClient()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const term = q.trim().toLowerCase()
  const pages = useMemo(
    () => (term ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(term)) : NAV_ITEMS),
    [term],
  )
  const matchedClients = useMemo(
    () => (canSwitch ? clients.filter((c) => !term || c.name.toLowerCase().includes(term)) : []),
    [term, clients, canSwitch],
  )

  const go = (to) => { navigate(to); setQ(''); setOpen(false) }
  const pick = (id) => { setActiveClient(id); setQ(''); setOpen(false) }

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <Icon
        name="search"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none"
      />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="bg-surface-container border border-outline rounded-xl pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-primary w-56 xl:w-64 transition-all"
        placeholder={placeholder}
        type="text"
      />
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up max-h-96 overflow-y-auto custom-scrollbar">
          <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono">
            Pages
          </p>
          {pages.length === 0 && <p className="px-4 py-2 text-xs text-on-surface-variant">No matches</p>}
          {pages.map((n) => (
            <button
              key={n.to}
              onClick={() => go(n.to)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface-variant transition-colors"
            >
              <Icon name={n.icon} className="text-base text-on-surface-variant" />
              {n.label}
            </button>
          ))}
          {canSwitch && (
            <>
              <p className="px-4 pt-3 pb-1 mt-1 text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono border-t border-outline">
                Clients
              </p>
              {matchedClients.length === 0 && (
                <p className="px-4 py-2 text-xs text-on-surface-variant">No matches</p>
              )}
              {matchedClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pick(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface-variant transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/40 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.initials}
                  </span>
                  {c.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

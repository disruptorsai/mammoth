import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useClient } from '../context/ClientContext'

function healthColor(score) {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-primary'
  return 'text-error'
}

export default function ClientSwitcher() {
  const { clients, activeClient, setActiveClient } = useClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-surface-container border border-outline rounded-full pl-2 pr-3 py-1.5 hover:border-primary transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center">
          {activeClient.initials}
        </span>
        <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
          {activeClient.name}
        </span>
        <Icon name="expand_more" className="text-base text-on-surface-variant" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          <p className="px-4 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono border-b border-outline">
            Switch Client
          </p>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveClient(c.id)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-variant transition-colors ${
                  c.id === activeClient.id ? 'bg-surface-variant/60' : ''
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {c.initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{c.name}</span>
                  <span className={`block text-[11px] font-label-mono ${healthColor(c.health)}`}>
                    Health {c.health}
                  </span>
                </span>
                {c.id === activeClient.id && (
                  <Icon name="check" className="text-primary text-base" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

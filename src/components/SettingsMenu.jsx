import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'

// Gear menu: shows the signed-in account + role, and Sign out.
export default function SettingsMenu() {
  const { user, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-on-surface-variant hover:text-primary transition-colors"
        aria-label="Settings"
      >
        <Icon name="settings" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          <div className="px-4 py-3 border-b border-outline">
            <p className="text-sm font-medium truncate">{user?.email || 'Signed in'}</p>
            <span className="inline-block mt-1 text-[10px] font-label-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
              {isAdmin ? 'Admin' : 'Client'}
            </span>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-error hover:bg-surface-variant transition-colors"
          >
            <Icon name="logout" className="text-base" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

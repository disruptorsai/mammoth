import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { useClient } from '../context/ClientContext'
import NewClientModal from './NewClientModal'

function healthColor(score) {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-primary'
  return 'text-error'
}

// Admin-only confirm dialog: deletes the client + all their data from OUR
// database. External accounts (their GoHighLevel, socials) are untouched.
function DeleteClientModal({ client, onClose, onDeleted }) {
  const { removeClient } = useClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await removeClient(client.id)
      onDeleted()
    } catch (e) {
      setError(e.message ?? String(e))
      setBusy(false)
    }
  }

  // Portal: the sidebar's CSS transform would otherwise trap this fixed
  // overlay inside the sidebar instead of centering it over the screen.
  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container border border-outline rounded-xl w-full max-w-md p-6 space-y-4 animate-fade-in-up"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center text-error shrink-0">
            <Icon name="delete_forever" />
          </div>
          <h3 className="font-headline-lg text-xl text-white">Delete {client.name}?</h3>
        </div>
        <p className="text-sm text-on-surface-variant">
          This permanently removes <span className="text-white font-medium">{client.name}</span>{' '}
          and all of their data in Mission Control — tasks, content, leads, campaigns, keywords,
          and usage history. Their logins are unlinked (not deleted).
        </p>
        <p className="text-sm text-on-surface-variant">
          Their <span className="text-primary">GoHighLevel account and social channels are NOT
          touched</span> — this only cleans up our database.
        </p>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-outline text-sm hover:border-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="px-5 py-2 rounded-lg bg-error/90 hover:bg-error text-black font-bold text-sm transition-colors disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete client'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function ClientSwitcher() {
  const { clients, activeClient, setActiveClient, canSwitch } = useClient()
  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [toEdit, setToEdit] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Client users are locked to their own workspace — show a static badge.
  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 w-full bg-surface-container border border-outline rounded-xl px-3 py-2">
        <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center shrink-0">
          {activeClient.initials}
        </span>
        <span className="text-sm font-medium truncate">{activeClient.name}</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full bg-surface-container border border-outline rounded-xl px-3 py-2 hover:border-primary transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center shrink-0">
          {activeClient.initials}
        </span>
        <span className="flex-1 min-w-0 text-left text-sm font-medium truncate">
          {activeClient.name}
        </span>
        <Icon name="expand_more" className="text-base text-on-surface-variant shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
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
                className={`group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-variant transition-colors ${
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
                {c.id === activeClient.id && <Icon name="check" className="text-primary text-base" />}
                <span
                  role="button"
                  aria-label={`Edit ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setToEdit(c)
                    setOpen(false)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary transition-all shrink-0"
                >
                  <Icon name="edit" className="text-base" />
                </span>
                <span
                  role="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setToDelete(c)
                    setOpen(false)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all shrink-0"
                >
                  <Icon name="delete" className="text-base" />
                </span>
              </button>
            ))}
            {clients.length === 0 && (
              <p className="px-4 py-4 text-sm text-on-surface-variant text-center">No clients yet.</p>
            )}
          </div>
          <button
            onClick={() => {
              setShowNew(true)
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-primary font-medium border-t border-outline hover:bg-surface-variant transition-colors"
          >
            <Icon name="add" className="text-base" /> New Client
          </button>
        </div>
      )}

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
      {toEdit && <NewClientModal client={toEdit} onClose={() => setToEdit(null)} />}
      {toDelete && (
        <DeleteClientModal
          client={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

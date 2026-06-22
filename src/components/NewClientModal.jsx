import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { useClient } from '../context/ClientContext'
import { slugify, initialsFrom, updateClient } from '../lib/clients'

// Optional, toggleable feature flags (internal is always on).
const TOGGLES = [
  { key: 'seo', label: 'SEO / GEO' },
  { key: 'social', label: 'Social Media' },
  { key: 'ads', label: 'Paid Ads' },
  { key: 'crm', label: 'CRM' },
]

// Create OR edit a client. Pass `client` to edit (name/modules/health; the id
// stays fixed so all their data stays linked). Rendered via a portal because
// the sidebar's CSS transform would otherwise trap the fixed overlay inside it.
export default function NewClientModal({ client = null, onClose }) {
  const { addClient, reload } = useClient()
  const isEdit = Boolean(client)
  const [name, setName] = useState(client?.name ?? '')
  const [health, setHealth] = useState(client?.health ?? 75)
  const [features, setFeatures] = useState(
    client
      ? {
          seo: !!client.features?.seo,
          social: !!client.features?.social,
          ads: !!client.features?.ads,
          crm: !!client.features?.crm,
        }
      : { seo: true, social: true, ads: true, crm: true },
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const id = useMemo(() => (isEdit ? client.id : slugify(name)), [isEdit, client, name])

  function toggle(key) {
    setFeatures((f) => ({ ...f, [key]: !f[key] }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (!isEdit && !id) {
      setError('Name must contain letters or numbers.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        initials: initialsFrom(name),
        health: Number(health),
        features: { internal: true, ...features },
      }
      if (isEdit) {
        await updateClient(client.id, payload)
        await reload()
      } else {
        await addClient({ id, ...payload })
      }
      onClose()
    } catch (err) {
      const msg = err?.message || String(err)
      setError(/duplicate key|already exists/i.test(msg) ? `A client with id "${id}" already exists.` : msg)
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-surface-container border border-outline rounded-xl w-full max-w-md p-6 space-y-4 animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-lg text-xl text-primary">
            {isEdit ? `Edit ${client.name}` : 'New Client'}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Client name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Dental"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          {!isEdit && name.trim() && (
            <span className="mt-1 block text-[11px] font-label-mono text-on-surface-variant">
              id: <span className="text-primary">{id}</span> · initials:{' '}
              <span className="text-primary">{initialsFrom(name)}</span>
            </span>
          )}
        </label>

        <div>
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Modules</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TOGGLES.map((t) => {
              const on = features[t.key]
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggle(t.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    on
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-outline text-on-surface-variant hover:border-primary'
                  }`}
                >
                  <Icon name={on ? 'check_box' : 'check_box_outline_blank'} className="text-base" />
                  {t.label}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-on-surface-variant">
            Off modules show a gated “Schedule the call” prompt instead of data.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
            Health · {health}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={health}
            onChange={(e) => setHealth(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </label>

        {error && (
          <p className="text-error text-sm flex items-center gap-1.5">
            <Icon name="error" className="text-base" /> {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-outline text-sm hover:border-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="gold-gradient text-on-primary font-bold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create client'}
          </button>
        </div>

        {!isEdit && (
          <p className="text-[11px] text-on-surface-variant text-center">
            Creates the workspace. Add their login in Supabase, then map it to{' '}
            <span className="font-label-mono text-primary">{id || 'this-client'}</span>.
          </p>
        )}
      </form>
    </div>,
    document.body,
  )
}

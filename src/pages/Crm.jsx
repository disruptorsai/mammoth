import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Fab from '../components/Fab'
import Icon from '../components/Icon'
import LeadBoard from '../components/LeadBoard'
import { useClient } from '../context/ClientContext'
import { useAuth } from '../context/AuthContext'
import { fetchLeads, fetchClientActivities, addLeadActivity, ACTIVITY_KINDS } from '../lib/leads'
import { relTime } from '../lib/activity'
import { syncLeadsFromGhl, fetchClientGhlKey, saveClientGhlKey } from '../lib/ghl'
import { updateClient } from '../lib/clients'
import { useToast } from '../components/Toast'

const KIND_STYLES = {
  note: { icon: 'sticky_note_2', bg: 'bg-primary/20', color: 'text-primary' },
  email: { icon: 'mail', bg: 'bg-primary/20', color: 'text-primary' },
  call: { icon: 'call', bg: 'bg-blue-500/20', color: 'text-blue-400' },
  meeting: { icon: 'groups', bg: 'bg-green-500/20', color: 'text-green-400' },
}

// Add-interaction composer: pick a lead, a kind, write the note.
function ActivityComposer({ leads, onAdded }) {
  const [leadId, setLeadId] = useState('')
  const [kind, setKind] = useState('note')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!leadId && leads.length) setLeadId(leads[0].id)
    if (leadId && !leads.some((l) => l.id === leadId)) setLeadId(leads[0]?.id ?? '')
  }, [leads, leadId])

  async function submit(e) {
    e.preventDefault()
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || !body.trim()) return
    setBusy(true)
    setError('')
    try {
      await addLeadActivity(lead, kind, body.trim())
      setBody('')
      onAdded()
    } catch (err) {
      setError(err.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!leads.length) return null

  return (
    <form onSubmit={submit} className="p-4 border-t border-outline space-y-2">
      <div className="flex gap-2">
        <select
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          className="flex-1 min-w-0 bg-surface-container border border-outline rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
        >
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="bg-surface-container border border-outline rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
        >
          {ACTIVITY_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Log an interaction…"
          className="flex-1 min-w-0 bg-surface-container border border-outline rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="gold-gradient text-black font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
        >
          Log
        </button>
      </div>
      {error && <p className="text-error text-xs">{error}</p>}
    </form>
  )
}

export default function Crm() {
  const { openNav } = useOutletContext()
  const { activeClient, reload: reloadClients } = useClient()
  const { isAdmin } = useAuth()
  const { show, node: toast } = useToast()
  const [activities, setActivities] = useState([])
  const [leads, setLeads] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [showGhlSettings, setShowGhlSettings] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')
  const [keyDraft, setKeyDraft] = useState('')
  const createLeadRef = useRef(null)

  const reloadSide = useCallback(async () => {
    const clientId = activeClient.id
    const [acts, lds] = await Promise.all([
      fetchClientActivities(clientId).catch(() => []),
      fetchLeads(clientId).catch(() => []),
    ])
    setActivities(acts)
    setLeads(lds)
  }, [activeClient.id])

  useEffect(() => {
    reloadSide()
  }, [reloadSide, refreshKey])

  const ghlConnected = Boolean(activeClient.ghlLocationId)

  async function runSync() {
    if (syncing) return
    setSyncing(true)
    try {
      const r = await syncLeadsFromGhl(activeClient)
      await reloadClients()
      setRefreshKey((k) => k + 1)
      show(`GHL sync complete — ${r.created} new, ${r.updated} updated.`, 'sync')
    } catch (e) {
      show(e.message ?? String(e), 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function openGhlSettings() {
    setLocationDraft(activeClient.ghlLocationId || '')
    setKeyDraft(await fetchClientGhlKey(activeClient.id))
    setShowGhlSettings(true)
  }

  async function saveGhlSettings(e) {
    e.preventDefault()
    try {
      await updateClient(activeClient.id, { ghl_location_id: locationDraft.trim() })
      await saveClientGhlKey(activeClient.id, keyDraft.trim())
      await reloadClients()
      setShowGhlSettings(false)
      show(locationDraft.trim() ? 'GHL settings saved.' : 'GHL disconnected.', 'check_circle')
    } catch (err) {
      show(err.message ?? String(err), 'error')
    }
  }

  return (
    <>
      <TopBar title="External Integrations" searchPlaceholder="Search leads…" onMenu={openNav} />

      <section className="p-margin-mobile md:p-margin-desktop">
        <div className="max-w-container-max mx-auto space-y-8">

          {/* Integration hub — only what we actually plan to connect */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-surface-container border border-outline rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Icon name="sync_alt" className="text-3xl" />
                </div>
                <span
                  className={`text-[10px] font-label-mono px-2 py-1 rounded uppercase ${
                    ghlConnected
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                      : 'bg-surface-variant text-on-surface-variant border border-outline'
                  }`}
                >
                  {ghlConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <h3 className="font-headline-lg text-on-surface mb-1">GoHighLevel</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                {ghlConnected
                  ? 'Pulls this client’s opportunities into the pipeline below (read-only sync — local drags don’t write back yet).'
                  : 'Link this client’s GHL location to pull their opportunities into the pipeline below.'}
              </p>
              <div className="flex items-center justify-between gap-2 relative z-10">
                <span className="text-xs text-on-surface-variant font-label-mono">
                  {activeClient.ghlLastSyncedAt
                    ? `Last sync: ${relTime(activeClient.ghlLastSyncedAt)}`
                    : ghlConnected
                      ? 'Never synced'
                      : ''}
                </span>
                <div className="flex gap-3">
                  {ghlConnected && (
                    <button
                      onClick={runSync}
                      disabled={syncing}
                      className="text-primary hover:underline text-sm font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Icon name="sync" className={`text-base ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing…' : 'Sync now'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={openGhlSettings}
                      className="text-on-surface-variant hover:text-primary text-sm font-bold transition-all"
                    >
                      Settings
                    </button>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5 pointer-events-none translate-x-4 translate-y-4">
                <Icon name="hub" className="text-[80px]" />
              </div>
            </div>

            {/* Pipeline value summary — real numbers from the leads table */}
            <div className="bg-surface-container border border-outline rounded-xl p-6 md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="font-headline-lg text-on-surface mb-1">Pipeline Summary</h3>
                <p className="text-sm text-on-surface-variant">
                  {activeClient.name} — live from the board below.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-[10px] font-label-mono uppercase tracking-widest text-on-surface-variant">Leads</p>
                  <p className="text-2xl font-bold mono-data">{leads.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-label-mono uppercase tracking-widest text-on-surface-variant">Pipeline value</p>
                  <p className="text-2xl font-bold mono-data gold-gradient-text">
                    {leads.length
                      ? `$${leads.reduce((a, l) => a + Number(l.value || 0), 0).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-label-mono uppercase tracking-widest text-on-surface-variant">In contract</p>
                  <p className="text-2xl font-bold mono-data">
                    {leads.filter((l) => l.stage_key === 'contract').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline & Interaction */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-headline-lg text-primary">Pipeline</h4>
              </div>
              <LeadBoard
                onChanged={() => setRefreshKey((k) => k + 1)}
                refreshKey={refreshKey}
                createRef={createLeadRef}
              />
            </div>

            {/* Interaction stream — real lead_activities */}
            <div className="lg:col-span-4 bg-surface-container-low border border-outline rounded-xl flex flex-col h-[560px]">
              <div className="p-6 border-b border-outline flex justify-between items-center">
                <h4 className="font-bold text-on-surface">Interaction Stream</h4>
                <span className="text-xs font-label-mono text-on-surface-variant">{activeClient.name}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {activities.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center py-8 px-4">
                    No interactions logged yet. Add a lead, then log notes, emails, calls, and
                    meetings here.
                  </p>
                )}
                {activities.map((item, i) => {
                  const s = KIND_STYLES[item.kind] || KIND_STYLES.note
                  return (
                    <div key={item.id} className="flex gap-4 relative">
                      {i < activities.length - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-px bg-outline" />
                      )}
                      <div
                        className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center ${s.color} shrink-0 z-10`}
                      >
                        <Icon name={s.icon} filled className="text-sm" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface capitalize">
                          {item.kind}{' '}
                          <span className="font-normal text-on-surface-variant">
                            — {item.leads?.name || 'lead'}
                          </span>
                        </p>
                        <p className="text-xs text-on-surface-variant line-clamp-3">{item.body}</p>
                        <span className="text-[10px] text-on-surface-variant font-label-mono uppercase">
                          {relTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <ActivityComposer leads={leads} onAdded={() => setRefreshKey((k) => k + 1)} />
            </div>
          </div>
        </div>
      </section>

      {showGhlSettings && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowGhlSettings(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveGhlSettings}
            className="bg-surface-container border border-outline rounded-xl w-full max-w-md p-6 space-y-4 animate-fade-in-up"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-lg text-xl text-primary">GoHighLevel Settings</h3>
              <button
                type="button"
                onClick={() => setShowGhlSettings(false)}
                className="text-on-surface-variant hover:text-primary"
              >
                <Icon name="close" />
              </button>
            </div>
            <label className="block">
              <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
                Location ID for {activeClient.name}
              </span>
              <input
                autoFocus
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                placeholder="e.g. ve9EPM428h8vShlRW1KT"
                className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-label-mono"
              />
              <span className="mt-1.5 block text-[11px] text-on-surface-variant">
                GHL → the sub-account’s Settings → Business Profile. Leave empty to disconnect.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
                Client’s own API key (optional)
              </span>
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="Only if this client runs their own GHL account"
                className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-label-mono"
              />
              <span className="mt-1.5 block text-[11px] text-on-surface-variant">
                Leave empty for sub-accounts under the agency — those use the agency key from the
                server env. For a client on their own GHL, paste their Private Integration token
                (their GHL → Settings → Private Integrations). Stored admin-only.
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGhlSettings(false)}
                className="px-4 py-2 rounded-lg border border-outline text-sm hover:border-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gold-gradient text-black font-bold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <Fab icon="add" title="New lead" onClick={() => createLeadRef.current?.()} />
      {toast}
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import Fab from '../components/Fab'
import { useToast } from '../components/Toast'
import { useClient } from '../context/ClientContext'
import {
  PLATFORMS,
  CAMPAIGN_STATUSES,
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  aggregateCampaigns,
  spendByPlatform,
  formatMoney,
} from '../lib/adCampaigns'
import { generateAdCopy } from '../lib/ai'

// Where the "Schedule the call now" CTA sends prospects. Swap for the real booking link.
const BOOKING_URL = 'https://calendly.com/disruptorsmedia/discovery'

const PLATFORM_LABELS = Object.fromEntries(PLATFORMS.map((p) => [p.key, p.label]))
const STATUS_BADGES = {
  active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  learning: 'bg-primary/10 text-primary border-primary/30',
  draft: 'bg-surface-variant text-on-surface-variant border-outline',
  paused: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
}
const PLATFORM_ICONS = {
  meta: 'thumb_up',
  google: 'search',
  tiktok: 'music_note',
  linkedin: 'work',
  youtube: 'play_circle',
  other: 'campaign',
}

// Shown instead of the analytics when a client has no paid-ads package.
function PaidAdsGate({ client }) {
  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full flex-1 flex items-center justify-center">
      <div className="bento-card rounded-xl p-10 md:p-14 max-w-xl w-full text-center relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Icon name="ads_click" className="text-[160px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center">
            <Icon name="lock" filled className="text-black text-3xl" />
          </div>
          <div>
            <h2 className="font-headline-lg text-2xl text-primary mb-2">
              Paid Advertising isn’t in {client.name}’s plan yet
            </h2>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Unlock campaign tracking, AI copy, and cross-channel scaling. Let’s map out a
              paid-media strategy built for your goals.
            </p>
          </div>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="gold-gradient text-black font-bold px-7 py-3.5 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity glow-gold"
          >
            <Icon name="calendar_month" className="text-lg" />
            Schedule the call now
          </a>
          <p className="text-xs font-label-mono text-on-surface-variant uppercase tracking-widest">
            Already have a package? Ask your strategist to enable it.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---- Campaign modal -----------------------------------------------------------
const EMPTY = {
  name: '',
  platform: 'meta',
  status: 'draft',
  spend: '',
  impressions: '',
  clicks: '',
  conversions: '',
  revenue: '',
}

function num(v) {
  return v === '' ? 0 : Math.max(0, Number(v) || 0)
}

function CampaignModal({ campaign, onClose, onSave, onDelete }) {
  const isNew = !campaign.id
  const [form, setForm] = useState({
    name: campaign.name ?? '',
    platform: campaign.platform ?? 'meta',
    status: campaign.status ?? 'draft',
    spend: campaign.spend != null && Number(campaign.spend) > 0 ? String(campaign.spend) : '',
    impressions:
      campaign.impressions != null && Number(campaign.impressions) > 0
        ? String(campaign.impressions)
        : '',
    clicks: campaign.clicks != null && Number(campaign.clicks) > 0 ? String(campaign.clicks) : '',
    conversions:
      campaign.conversions != null && Number(campaign.conversions) > 0
        ? String(campaign.conversions)
        : '',
    revenue:
      campaign.revenue != null && Number(campaign.revenue) > 0 ? String(campaign.revenue) : '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      platform: form.platform,
      status: form.status,
      spend: num(form.spend),
      impressions: Math.round(num(form.impressions)),
      clicks: Math.round(num(form.clicks)),
      conversions: Math.round(num(form.conversions)),
      revenue: num(form.revenue),
    })
  }

  const numField = (key, label, step = '1') => (
    <label className="block">
      <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={form[key]}
        onChange={set(key)}
        placeholder="0"
        className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
      />
    </label>
  )

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-surface-container border border-outline rounded-xl w-full max-w-lg p-6 space-y-4 animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-lg text-xl text-primary">
            {isNew ? 'New Campaign' : 'Edit Campaign'}
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Name</span>
          <input
            autoFocus
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Q4 Growth Accelerator"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Platform</span>
            <select
              value={form.platform}
              onChange={set('platform')}
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {PLATFORMS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Status</span>
            <select
              value={form.status}
              onChange={set('status')}
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {numField('spend', 'Spend ($)', '0.01')}
          {numField('revenue', 'Revenue ($)', '0.01')}
          {numField('impressions', 'Impressions')}
          {numField('clicks', 'Clicks')}
          {numField('conversions', 'Conversions')}
        </div>

        <div className="flex items-center justify-between pt-2">
          {!isNew ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-error text-sm font-medium hover:underline flex items-center gap-1"
            >
              <Icon name="delete" className="text-base" /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-outline text-sm hover:border-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="gold-gradient text-black font-bold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ---- AI Copy Generator -------------------------------------------------------
const TONES = ['Disruptive', 'Premium', 'Urgent', 'Friendly']
const COPY_PLATFORMS = ['Meta Ads', 'Google Ads', 'TikTok', 'LinkedIn', 'YouTube']

function CopyGenerator({ clientId, clientName, show }) {
  const [brief, setBrief] = useState('')
  const [tone, setTone] = useState('Disruptive')
  const [platform, setPlatform] = useState('Meta Ads')
  const [busy, setBusy] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  async function generate() {
    if (!brief.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const { text } = await generateAdCopy({ clientId, clientName, platform, tone, brief: brief.trim() })
      setOutput(text)
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-surface-container border border-outline rounded-xl p-8 relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
      <div className="flex items-center gap-3 mb-6">
        <Icon name="auto_awesome" filled className="text-primary" />
        <h3 className="font-headline-lg text-headline-lg font-bold">AI Copy Generator</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="font-mono-supply text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">Brief</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              className="w-full bg-surface-container-low border border-outline focus:border-primary focus:outline-none rounded-lg p-3 font-body-md text-on-surface text-sm"
              placeholder="E.g. High-conversion hook for a spring teeth-whitening offer…"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="font-mono-supply text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="font-mono-supply text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {COPY_PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={busy || !brief.trim()}
            className="w-full py-4 bg-primary text-black font-bold rounded-lg shadow-[0_4px_20px_rgba(191,149,63,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {busy && <Icon name="progress_activity" className="animate-spin" />}
            {busy ? 'Generating…' : 'Generate Copy Assets'}
          </button>
          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-outline pt-6 lg:pt-0 lg:pl-8">
          <div className="flex justify-between items-center mb-4">
            <p className="font-mono-supply text-label-mono text-primary text-xs">OUTPUT</p>
            {output && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(output)
                    show('Copied to clipboard.', 'content_copy')
                  }}
                  aria-label="Copy output"
                >
                  <Icon name="content_copy" className="text-on-surface-variant cursor-pointer hover:text-white" />
                </button>
                <button onClick={generate} disabled={busy} aria-label="Generate again">
                  <Icon name="refresh" className="text-on-surface-variant cursor-pointer hover:text-white" />
                </button>
              </div>
            )}
          </div>
          {output ? (
            <div className="p-4 bg-background border border-outline rounded-lg text-on-surface font-body-md text-sm whitespace-pre-wrap">
              {output}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant border border-dashed border-outline rounded-lg p-6 text-center">
              Generated copy appears here.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ---- Page -----------------------------------------------------------------------
export default function PaidAdvertising() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const { show, node: toast } = useToast()

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCampaigns(await fetchCampaigns(activeClient.id))
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [activeClient.id])

  useEffect(() => {
    load()
  }, [load])

  const agg = useMemo(() => aggregateCampaigns(campaigns), [campaigns])
  const platformShare = useMemo(() => spendByPlatform(campaigns), [campaigns])

  async function saveCampaign(fields) {
    const editing = modal.campaign
    setModal(null)
    try {
      if (editing.id) await updateCampaign(editing.id, fields)
      else await createCampaign(activeClient.id, fields)
      load()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  async function removeCampaign() {
    const editing = modal.campaign
    setModal(null)
    if (!editing.id) return
    try {
      await deleteCampaign(editing.id)
      load()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  // Gate the tab for clients without a paid-ads package.
  if (!activeClient.features.ads) {
    return (
      <>
        <TopBar title="Paid Advertising" searchPlaceholder="Search Analytics…" onMenu={openNav} />
        <PaidAdsGate client={activeClient} />
      </>
    )
  }

  const metricCells = [
    { label: 'Total Ad Spend', value: campaigns.length ? formatMoney(agg.spend) : '—', gold: true },
    { label: 'Avg. ROAS', value: agg.roas != null ? `${agg.roas.toFixed(2)}x` : '—' },
    { label: 'CPA (Blended)', value: agg.cpa != null ? formatMoney(agg.cpa) : '—' },
    { label: 'Conversions', value: campaigns.length ? agg.conversions.toLocaleString() : '—' },
  ]

  return (
    <>
      <TopBar title="Paid Advertising" searchPlaceholder="Search Analytics…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">

        {error && (
          <div className="p-3 rounded-lg border border-error/50 bg-error/10 text-sm text-error">{error}</div>
        )}

        {/* Analytics overview — aggregated from real campaign rows */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 bg-surface-container border border-outline rounded-xl p-8 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="font-headline-lg text-headline-lg font-bold text-primary mb-1">
                    Ads Analytics Overview
                  </h2>
                  <p className="font-mono-supply text-label-mono uppercase tracking-widest text-on-surface-variant opacity-60">
                    Aggregated from {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} — {activeClient.name}
                  </p>
                </div>
                {loading && <Icon name="progress_activity" className="animate-spin text-primary" />}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                {metricCells.map((m) => (
                  <div key={m.label} className="space-y-1">
                    <p className="text-on-surface-variant font-body-md opacity-60">{m.label}</p>
                    <p
                      className={`text-3xl font-bold font-headline-lg ${m.gold ? 'gold-gradient-text' : 'text-on-surface'}`}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              {campaigns.length === 0 && !loading && (
                <p className="text-sm text-on-surface-variant border border-dashed border-outline rounded-lg p-6 text-center">
                  No campaigns yet — add your first one and the analytics fill in from real numbers.
                </p>
              )}
            </div>
          </div>

          {/* Cross-channel spend share — derived */}
          <div className="lg:col-span-4 bg-surface-container border border-outline rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">Channel Split</h3>
              <Icon name="hub" className="text-primary" />
            </div>
            {platformShare.length === 0 ? (
              <p className="text-sm text-on-surface-variant flex-1 flex items-center justify-center text-center">
                Spend by platform appears here once campaigns have spend.
              </p>
            ) : (
              <div className="space-y-4">
                {platformShare.map((p) => (
                  <div key={p.platform}>
                    <div className="flex justify-between text-xs font-mono-supply mb-1">
                      <span className="uppercase">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                      <span className="text-on-surface-variant">
                        {formatMoney(p.value)} · {Math.round(p.share * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.max(2, p.share * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* AI Copy Generator — live via the Claude API */}
        <CopyGenerator clientId={activeClient.id} clientName={activeClient.name} show={show} />

        {/* Campaigns — real CRUD */}
        <section className="bg-surface-container border border-outline rounded-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-outline flex justify-between items-center">
            <h3 className="font-headline-lg text-headline-lg font-bold">Campaigns</h3>
            <button
              onClick={() => setModal({ campaign: { ...EMPTY } })}
              className="gold-gradient text-black font-bold px-4 py-2 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
            >
              <Icon name="add" /> New Campaign
            </button>
          </div>
          <div className="overflow-x-auto">
            {campaigns.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-10 text-center">
                No campaigns yet for {activeClient.name}.
              </p>
            ) : (
              <table className="w-full text-left font-body-md">
                <thead>
                  <tr className="border-b border-outline bg-surface-container-high/50">
                    {['Campaign', 'Status', 'Spend', 'Impressions', 'Conversions', 'Revenue', ''].map((h) => (
                      <th
                        key={h}
                        className="px-8 py-4 font-mono-supply text-xs text-on-surface-variant uppercase tracking-widest"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setModal({ campaign: c })}
                      className="hover:bg-surface-variant/30 transition-colors cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded flex items-center justify-center border bg-primary/10 border-primary/30">
                            <Icon name={PLATFORM_ICONS[c.platform] || 'campaign'} className="text-primary text-sm" />
                          </div>
                          <div>
                            <p className="font-bold">{c.name}</p>
                            <p className="text-xs text-on-surface-variant opacity-60 uppercase">
                              {PLATFORM_LABELS[c.platform] || c.platform}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold border rounded uppercase ${STATUS_BADGES[c.status] || STATUS_BADGES.draft}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold">{formatMoney(Number(c.spend))}</td>
                      <td className="px-8 py-5 text-on-surface-variant">
                        {Number(c.impressions).toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-on-surface-variant">
                        {Number(c.conversions).toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-on-surface-variant">{formatMoney(Number(c.revenue))}</td>
                      <td className="px-8 py-5">
                        <Icon name="edit" className="text-on-surface-variant hover:text-primary" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {modal && (
        <CampaignModal
          campaign={modal.campaign}
          onClose={() => setModal(null)}
          onSave={saveCampaign}
          onDelete={removeCampaign}
        />
      )}

      <Fab icon="add" title="New campaign" onClick={() => setModal({ campaign: { ...EMPTY } })} />
      {toast}
    </>
  )
}

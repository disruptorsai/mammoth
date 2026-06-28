import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import NewClientModal from '../components/NewClientModal'
import { useClient } from '../context/ClientContext'
import { fetchKeywords, createKeyword, deleteKeyword } from '../lib/seoKeywords'
import {
  fetchDashboard,
  fetchDrafts,
  fetchCaKeywords,
  fetchSeoReports,
  fetchSeoReport,
  fetchSiteAnalysis,
  requestDraftGeneration,
  requestKeywordResearch,
  requestSiteAnalysis,
  requestSeoReport,
  fetchKnowledgeBase,
  saveKnowledgeBase,
  fetchBrandVoice,
  saveBrandVoice,
  fetchDraft,
  saveDraftHumanized,
  setDraftStatus,
  publishToMainSite,
  generateDraftImage,
  addApproval,
  fetchApprovals,
  importDraft,
  fetchPromptTemplates,
  createPromptTemplate,
  activatePromptTemplate,
  deletePromptTemplate,
  listConversations,
  saveConversation,
  deleteConversation,
  chatComplete,
  requestImage,
  listImages,
  saveImage,
  deleteImage,
  fetchClientSettings,
  saveClientSettings,
  listApiKeys,
  saveApiKey,
  draftStatusStyle,
  prettyStatus,
  dollars,
  flattenRecommendations,
  impactStyle,
} from '../lib/contentAgent'

// Native SEO/GEO workspace. Reproduces the Content Agent screen layouts in
// Mammoth's black/gold theme; all data is read from Mission Control's OWN
// Supabase, keyed by the active client slug. No dependency on any other project.

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'agent', label: 'AI Agent', icon: 'forum' },
  { key: 'drafts', label: 'Drafts', icon: 'description' },
  { key: 'keywords', label: 'Keywords', icon: 'travel_explore' },
  { key: 'prompts', label: 'Prompt Studio', icon: 'tune' },
  { key: 'images', label: 'AI Images', icon: 'image' },
  { key: 'reports', label: 'SEO / GEO', icon: 'assessment' },
  { key: 'analysis', label: 'Site Analysis', icon: 'query_stats' },
  { key: 'knowledge', label: 'Knowledge Base', icon: 'menu_book' },
  { key: 'blog', label: 'Blog Studio', icon: 'upload_file' },
  { key: 'watchlist', label: 'Watchlist', icon: 'visibility' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]
const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s]))

// Grouped navigation (Content Agent–style) so 12 sections stay scannable.
const NAV_GROUPS = [
  { label: 'Overview', items: ['dashboard'] },
  { label: 'Create', items: ['agent', 'drafts', 'blog', 'images'] },
  { label: 'Research', items: ['keywords', 'analysis', 'reports'] },
  { label: 'Configure', items: ['knowledge', 'prompts', 'watchlist', 'settings'] },
]

// Cross-section navigation + toast, so any section can route the user or confirm.
const NavCtx = createContext(() => {})
const ToastCtx = createContext(() => {})
const useGo = () => useContext(NavCtx)
const useToastShow = () => useContext(ToastCtx)

const DRAFT_FILTERS = ['all', 'pending_approval', 'needs_revision', 'approved', 'published', 'failed']
const DRAFT_TYPES = ['blog_post', 'service_page', 'faq', 'product_description', 'email']

// Small async-loading hook.
function useResource(fn, deps) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const reload = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fn()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(reload, [reload])
  return { data, loading, error, reload }
}

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <Icon name="progress_activity" className="animate-spin text-primary text-3xl" />
  </div>
)

function Boundary({ loading, error, empty, emptyTitle, emptyHint, children }) {
  if (loading) return <Spinner />
  if (error)
    return (
      <div className="glass-card p-10 text-center">
        <p className="font-display text-lg">Couldn’t load this</p>
        <p className="mt-2 text-sm text-on-surface-variant">{error.message || String(error)}</p>
      </div>
    )
  if (empty)
    return (
      <div className="glass-card p-10 text-center">
        <p className="font-display text-lg">{emptyTitle}</p>
        {emptyHint && <p className="mt-2 text-sm text-on-surface-variant">{emptyHint}</p>}
      </div>
    )
  return children
}

// Render AI text as markdown (headings, lists, bold, links, code, tables).
function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
    </div>
  )
}

// Copy-to-clipboard button (copies the raw markdown source).
function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || '')
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
    >
      <Icon name={done ? 'check' : 'content_copy'} className="text-sm" />
      {done ? 'Copied' : label}
    </button>
  )
}

// Content Agent style page header (left gold bar + section label + title + desc).
function PageHeader({ label, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-l-4 border-primary pl-5">
      <div>
        <p className="section-label mb-2">{label}</p>
        <h2 className="font-display text-3xl md:text-4xl gold-shine">{title}</h2>
        {description && <p className="mt-2 text-sm text-on-surface-variant max-w-2xl">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

// Inline "run a job" control (Content Agent "Step 1: domain/keyword" pattern).
function JobRunner({ step, label, placeholder, buttonText, icon, initialValue = '', hint, successMsg, onRun }) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToastShow()
  async function run(e) {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await onRun(value.trim())
      toast(successMsg || `${buttonText} complete`, 'check_circle')
    } catch (e2) {
      setError(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={run} className="glass-card p-6">
      <div className="mb-4 flex items-baseline gap-2">
        {step && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            {step}
          </span>
        )}
        <p className="section-label">{label}</p>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="input-field flex-1 min-w-[260px]"
        />
        <button type="submit" disabled={busy || !value.trim()} className="btn-primary">
          <Icon name={busy ? 'progress_activity' : icon} className={`text-base ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Working…' : buttonText}
        </button>
      </div>
      {hint && <p className="mt-3 text-xs text-on-surface-variant">{hint}</p>}
      {error && <p className="mt-3 text-sm text-error">{error}</p>}
    </form>
  )
}

// --- Dashboard --------------------------------------------------------------

const PIPELINE_COLORS = {
  approved: 'bg-primary',
  published: 'bg-emerald-400',
  pending_approval: 'bg-amber-400',
  needs_revision: 'bg-orange-400',
  generating: 'bg-sky-400',
  queued: 'bg-sky-400',
  failed: 'bg-error',
}

function Scorecard({ label, value, sub }) {
  return (
    <div className="glass-card p-5">
      <p className="section-label mb-3">{label}</p>
      <p className="font-display text-3xl tracking-[-0.5px] text-primary">{value}</p>
      {sub && <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

// Getting-started checklist — guides a new client through first-run setup. Hides
// itself once every step is done.
function OnboardingCard({ data }) {
  const go = useGo()
  const kb = data.knowledgeBase || {}
  const voice = data.brandVoice || {}
  const steps = [
    {
      label: 'Set up the Knowledge Base',
      hint: 'Brand voice + facts make every AI generation on-brand.',
      done: Boolean(voice.voice_tone || kb.brand_guidelines || kb.case_studies || kb.unique_facts),
      to: 'knowledge',
      cta: 'Open Knowledge Base',
    },
    { label: 'Research keywords', hint: 'Find opportunities worth writing about.', done: data.keywords.length > 0, to: 'keywords', cta: 'Research keywords' },
    { label: 'Generate your first draft', hint: 'Turn a topic into a ready-to-edit draft.', done: data.drafts.length > 0, to: 'drafts', cta: 'Create a draft' },
    { label: 'Approve a draft', hint: 'Review, edit and approve content.', done: data.drafts.some((d) => d.status === 'approved' || d.status === 'published'), to: 'drafts', cta: 'Review drafts' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Get started</p>
          <p className="mt-1 text-sm text-on-surface-variant">{doneCount} of {steps.length} done — finish setup to get the most out of your SEO/GEO workspace.</p>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-container-low">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {steps.map((s) => (
          <div key={s.label} className={`flex items-start gap-3 rounded-lg border p-4 ${s.done ? 'border-primary/30 bg-surface-container-low' : 'border-outline bg-surface-container'}`}>
            <Icon name={s.done ? 'check_circle' : 'radio_button_unchecked'} filled={s.done} className={`text-lg shrink-0 ${s.done ? 'text-primary' : 'text-on-surface-variant'}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{s.label}</p>
              {!s.done && (
                <>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{s.hint}</p>
                  <button onClick={() => go(s.to)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all">
                    {s.cta} <Icon name="arrow_forward" className="text-sm" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Minimal sparkline (daily spend over 30d), matching CA's gold polyline.
function Sparkline({ points }) {
  const max = Math.max(1, ...points)
  const w = 300
  const h = 56
  const step = points.length > 1 ? w / (points.length - 1) : w
  const poly = points.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-14 w-full text-primary">
      <polyline points={poly} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const DASH_QUICKNAV = [
  { to: 'agent', icon: 'forum', title: 'AI Agent', blurb: 'Chat with content personas, on brand.' },
  { to: 'drafts', icon: 'description', title: 'Drafts', blurb: 'Generate and manage content.' },
  { to: 'keywords', icon: 'travel_explore', title: 'Keywords', blurb: 'Find opportunities worth writing about.' },
  { to: 'analysis', icon: 'query_stats', title: 'Site Analysis', blurb: 'Rankings and a recommended strategy.' },
  { to: 'reports', icon: 'assessment', title: 'SEO / GEO', blurb: 'Run PageSpeed + AI audits.' },
  { to: 'knowledge', icon: 'menu_book', title: 'Knowledge Base', blurb: 'Brand voice & facts for the AI.' },
]

const KB_COMPLETENESS = [
  { key: 'voice_tone', label: 'Brand voice', src: 'voice' },
  { key: 'brand_guidelines', label: 'Guidelines', src: 'kb' },
  { key: 'case_studies', label: 'Case studies', src: 'kb' },
  { key: 'unique_facts', label: 'Unique facts', src: 'kb' },
  { key: 'faq', label: 'FAQ', src: 'kb' },
  { key: 'brand_voice_samples', label: 'Voice samples', src: 'kb' },
]

function DashboardSection({ clientId }) {
  const { data, loading, error } = useResource(() => fetchDashboard(clientId), [clientId])
  const go = useGo()

  const stats = useMemo(() => {
    const usage = data?.usage ?? []
    const spend = usage.reduce((s, u) => s + (u.cost_cents || 0), 0)
    const tokens = usage.reduce((s, u) => s + (u.tokens || 0), 0)
    const activeJobs = (data?.jobs ?? []).filter((j) => j.status === 'running' || j.status === 'queued').length
    const byEvent = {}
    for (const u of usage) byEvent[u.event] = (byEvent[u.event] || 0) + (u.cost_cents || 0)
    const costByEvent = Object.entries(byEvent).sort((a, b) => b[1] - a[1])
    // 30 daily spend buckets for the sparkline.
    const days = 30
    const buckets = new Array(days).fill(0)
    const now = Date.now()
    for (const u of usage) {
      const idx = days - 1 - Math.floor((now - new Date(u.ts).getTime()) / 86400000)
      if (idx >= 0 && idx < days) buckets[idx] += u.cost_cents || 0
    }
    const counts = {}
    for (const d of data?.drafts ?? []) counts[d.status] = (counts[d.status] || 0) + 1
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return { spend, tokens, activeJobs, costByEvent, buckets, peak: Math.max(0, ...buckets), pipeline: { counts, total } }
  }, [data])

  const kbDone = useMemo(() => {
    if (!data) return { done: 0, total: KB_COMPLETENESS.length, items: [] }
    const items = KB_COMPLETENESS.map((f) => ({
      label: f.label,
      done: Boolean((f.src === 'voice' ? data.brandVoice : data.knowledgeBase)?.[f.key]),
    }))
    return { done: items.filter((i) => i.done).length, total: items.length, items }
  }, [data])

  return (
    <Boundary loading={loading} error={error}>
      {data && (
        <div className="space-y-4">
          {/* Hero */}
          <section className="rounded-xl border border-outline bg-surface-container-high px-6 py-8 md:px-10">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">AI content workspace</p>
            <h3 className="mt-2 font-display text-3xl md:text-4xl gold-shine">{data.client?.name || 'Client'} content engine</h3>
            <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
              Plan, generate and ship on-brand SEO/GEO content — research keywords, draft with AI, run audits, and track what ranks, all in one place.
            </p>
          </section>

          <OnboardingCard data={data} />

          {/* Quick navigation */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DASH_QUICKNAV.map((q) => (
              <button key={q.to} onClick={() => go(q.to)} className="glass-card flex flex-col gap-2 p-5 text-left transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg">{q.title}</span>
                  <Icon name={q.icon} className="text-primary text-xl" />
                </div>
                <span className="flex-1 text-sm text-on-surface-variant">{q.blurb}</span>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-primary">Open <Icon name="arrow_forward" className="text-sm" /></span>
              </button>
            ))}
          </section>

          {/* KPI scorecards */}
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Scorecard label="Tokens · 30d" value={stats.tokens.toLocaleString()} />
            <Scorecard label="Drafts · 30d" value={data.drafts.length} />
            <Scorecard label="Spend · 30d" value={dollars(stats.spend)} sub={`${data.usage.length} events`} />
            <Scorecard label="Active jobs" value={stats.activeJobs} />
          </section>

          {/* Spend trend + cost by event */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="glass-card p-6">
              <p className="section-label mb-4">Spend · last 30 days</p>
              {stats.spend === 0 ? (
                <p className="text-sm text-on-surface-variant">No spend yet.</p>
              ) : (
                <>
                  <Sparkline points={stats.buckets} />
                  <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    <span>30d ago</span>
                    <span>peak {dollars(stats.peak)}</span>
                    <span>today</span>
                  </div>
                </>
              )}
            </div>
            <div className="glass-card p-6">
              <p className="section-label mb-4">Cost by event</p>
              {stats.costByEvent.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No usage yet.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.costByEvent.map(([event, cents]) => (
                    <li key={event} className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant">{prettyStatus(event)}</span>
                      <span className="font-display text-base tabular-nums">{dollars(cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Knowledge base completeness */}
          <section className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="section-label">Knowledge base completeness</p>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(kbDone.done / kbDone.total) * 100}%` }} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {kbDone.items.map((i) => (
                <span
                  key={i.label}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
                    i.done ? 'border-primary bg-primary/15 text-primary' : 'border-outline bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {i.done ? '✓ ' : ''}{i.label}
                </span>
              ))}
              {kbDone.done < kbDone.total && (
                <button onClick={() => go('knowledge')} className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Complete it →</button>
              )}
            </div>
          </section>

          {/* Strategist recommendations */}
          {data.siteAnalysis && (
            <section className="glass-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="section-label">Strategist recommendations</p>
                <button onClick={() => go('analysis')} className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">See all →</button>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                {data.siteAnalysis.domain} · {(data.siteAnalysis.generated_at || '').slice(0, 10)}
              </p>
              <ul className="mt-3 space-y-2">
                {flattenRecommendations(data.siteAnalysis.recommendations).items.slice(0, 5).map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-outline/60 bg-surface-container-low px-4 py-2.5 text-sm">
                    <span className="truncate text-on-surface/90">{r.title}</span>
                    <button onClick={() => go('drafts')} className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary">Generate →</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Latest report + top keywords */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="glass-card p-6">
              <p className="section-label mb-4">Latest SEO / GEO report</p>
              {data.seoReports.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No reports yet.</p>
              ) : (
                <>
                  <p className="font-display text-2xl gold-shine">{data.seoReports[0].domain}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{(data.seoReports[0].generated_at || '').slice(0, 10)}</p>
                  <button onClick={() => go('reports')} className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary">View reports <Icon name="arrow_forward" className="text-sm" /></button>
                </>
              )}
            </div>
            <div className="glass-card p-6">
              <p className="section-label mb-4">Top keyword opportunities</p>
              {data.keywords.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No keyword research yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.keywords.slice(0, 6).map((k) => (
                    <li key={k.keyword} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-on-surface/90">{k.keyword}</span>
                      <span className="font-display text-base tabular-nums text-primary">{k.leverage_score != null ? Number(k.leverage_score).toFixed(1) : '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Drafts pipeline */}
          <section className="glass-card p-6">
            <p className="section-label mb-4">Drafts pipeline · 30d</p>
            {stats.pipeline.total === 0 ? (
              <p className="text-sm text-on-surface-variant">No drafts in the last 30 days.</p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container-low">
                  {Object.entries(stats.pipeline.counts).map(([status, n]) => (
                    <div key={status} className={PIPELINE_COLORS[status] || 'bg-outline'} style={{ width: `${(n / stats.pipeline.total) * 100}%` }} title={`${prettyStatus(status)}: ${n}`} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                  {Object.entries(stats.pipeline.counts).map(([status, n]) => (
                    <span key={status} className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${PIPELINE_COLORS[status] || 'bg-outline'}`} />
                      {prettyStatus(status)} {n}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Recent activity */}
          <section className="glass-card p-6">
            <p className="section-label mb-4">Recent activity</p>
            {data.jobs.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No recent jobs.</p>
            ) : (
              <ul className="divide-y divide-outline/50">
                {data.jobs.slice(0, 8).map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-display text-sm">{prettyStatus(j.kind)}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">{(j.created_at || '').slice(0, 10)}</p>
                    </div>
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-mono uppercase ${draftStatusStyle(j.status)}`}>{prettyStatus(j.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Boundary>
  )
}

// --- Drafts -----------------------------------------------------------------

const ACTIVE_STATUSES = new Set(['generating', 'queued'])

function DraftsSection({ clientId }) {
  const [filter, setFilter] = useState('all')
  const { data, loading, error, reload } = useResource(() => fetchDrafts(clientId, filter), [clientId, filter])
  const counts = data?.counts ?? {}

  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('blog_post')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [selected, setSelected] = useState(null)
  // Knowledge Base is ON by default — drafts are written using the client's
  // brand voice, case studies, facts, etc. Users can turn it off per draft.
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true)
  const toast = useToastShow()

  async function generate(e) {
    e.preventDefault()
    if (!topic.trim() || generating) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await requestDraftGeneration({ clientId, contentType, topic: topic.trim(), useKnowledgeBase })
      setTopic('')
      await reload()
      if (res?.async) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          const fresh = await fetchDrafts(clientId, filter)
          if (!fresh.rows.some((d) => d.status === 'generating')) break
        }
        await reload()
      }
      toast('Draft generated', 'check_circle')
    } catch (e2) {
      setGenError(e2.message ?? String(e2))
    } finally {
      setGenerating(false)
    }
  }

  if (selected) {
    return (
      <DraftEditor
        draftId={selected}
        onBack={() => {
          setSelected(null)
          reload()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* New draft */}
      <form onSubmit={generate} className="glass-card p-6">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            New draft
          </span>
          <p className="section-label">Generate content with AI</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic — e.g. Why local SEO matters for clinics"
            className="input-field flex-1 min-w-[260px]"
          />
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="input-field w-full sm:w-48">
            {DRAFT_TYPES.map((t) => (
              <option key={t} value={t}>
                {prettyStatus(t)}
              </option>
            ))}
          </select>
          <button type="submit" disabled={generating || !topic.trim()} className="btn-primary">
            <Icon name={generating ? 'progress_activity' : 'auto_awesome'} className={`text-base ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Generate draft'}
          </button>
        </div>

        {/* Knowledge Base — ON by default, prominent so it's not missed. */}
        <div
          className={`mt-4 flex items-start gap-3 rounded-lg border p-3 transition-colors ${
            useKnowledgeBase ? 'border-primary/40 bg-primary/10' : 'border-outline bg-surface-container-low'
          }`}
        >
          <Icon name={useKnowledgeBase ? 'auto_stories' : 'menu_book'} className={`mt-0.5 text-lg ${useKnowledgeBase ? 'text-primary' : 'text-on-surface-variant'}`} filled={useKnowledgeBase} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                Use Knowledge Base
                <span className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${useKnowledgeBase ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {useKnowledgeBase ? 'On' : 'Off'}
                </span>
              </p>
              {/* Toggle switch — knob stays high-contrast in both states:
                  dark knob on the gold ON track, light knob on the dark OFF track. */}
              <button
                type="button"
                role="switch"
                aria-checked={useKnowledgeBase}
                aria-label="Use Knowledge Base"
                onClick={() => setUseKnowledgeBase((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${useKnowledgeBase ? 'bg-primary' : 'bg-outline'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    useKnowledgeBase ? 'translate-x-6 bg-background' : 'translate-x-1 bg-on-surface'
                  }`}
                />
              </button>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              {useKnowledgeBase
                ? "On by default — drafts are written using this client's Knowledge Base (case studies, brand guidelines, unique facts, FAQ) for accurate, on-brand content. Turn off to generate from the topic alone."
                : 'Off — drafts will be generated from the topic only, ignoring the client Knowledge Base. Brand voice still applies.'}
            </p>
          </div>
        </div>

        {genError && <p className="mt-3 text-sm text-error">{genError}</p>}
      </form>

      {/* Filter pills */}
      <nav className="flex flex-wrap gap-2">
        {DRAFT_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`nav-pill ${filter === f ? 'active' : ''}`}>
            {prettyStatus(f)}
            {counts[f] != null && <span className="ml-1.5 opacity-60">{counts[f]}</span>}
          </button>
        ))}
      </nav>

      <Boundary
        loading={loading}
        error={error}
        empty={data && data.rows.length === 0}
        emptyTitle="No drafts here"
        emptyHint="Generate one above, or pick another filter."
      >
        {data && data.rows.length > 0 && (
          <ul className="space-y-2">
            {data.rows.map((d) => (
              <li
                key={d.id}
                onClick={() => setSelected(d.id)}
                className="group relative flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline bg-surface-container px-5 py-4 transition-all hover:border-outline-variant hover:bg-surface-container-high"
              >
                <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon name="smart_toy" className="text-primary text-base shrink-0" />
                    <p className="truncate text-base font-semibold">{d.topic || 'Untitled draft'}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {prettyStatus(d.content_type) || 'content'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Icon name="calendar_today" className="text-xs" />
                      {(d.updated_at || '').slice(0, 10)}
                    </span>
                    <span className="text-xs tabular-nums text-on-surface-variant">{dollars(d.cost_cents)}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-wide ${draftStatusStyle(d.status)}`}
                >
                  {ACTIVE_STATUSES.has(d.status) && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                  {prettyStatus(d.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Boundary>
    </div>
  )
}

// --- Keywords ---------------------------------------------------------------

function leverageTier(score) {
  if (score == null) return { label: 'n/a', className: 'border-outline bg-transparent text-on-surface-variant/70' }
  if (score >= 60) return { label: 'high', className: 'border-primary bg-primary text-on-primary' }
  if (score >= 45) return { label: 'med', className: 'border-primary/40 bg-primary/10 text-primary' }
  return { label: 'low', className: 'border-outline bg-surface-container-low text-on-surface-variant' }
}

function KeywordsSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => fetchCaKeywords(clientId), [clientId])
  return (
    <div className="space-y-4">
      <JobRunner
        step="Research"
        label="Find keyword opportunities"
        placeholder="A keyword — e.g. ai automation for small business"
        buttonText="Research"
        icon="travel_explore"
        hint="Pulls live volume, difficulty and intent (DataForSEO) and scores the opportunity."
        onRun={async (keyword) => {
          await requestKeywordResearch(clientId, keyword)
          await reload()
        }}
      />
      <Boundary
        loading={loading}
        error={error}
        empty={data && data.rows.length === 0}
        emptyTitle="No keyword research yet"
        emptyHint="Research a keyword above to populate this list."
      >
        {data && data.rows.length > 0 && (
          <div className="glass-card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline text-left">
                  {['keyword', 'volume', 'difficulty', 'intent', 'leverage'].map((h) => (
                    <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((k) => {
                  const tier = leverageTier(k.leverage_score)
                  return (
                    <tr key={k.id} className="border-b border-outline/40 transition-colors hover:bg-surface-container-low">
                      <td className="px-4 py-3 font-display text-base">{k.keyword}</td>
                      <td className="px-4 py-3 tabular-nums text-on-surface-variant">{k.volume ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums text-on-surface-variant">{k.difficulty ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{k.intent ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${tier.className}`}>
                            {tier.label}
                          </span>
                          <span className="font-display text-lg tabular-nums text-primary">
                            {k.leverage_score != null ? Number(k.leverage_score).toFixed(1) : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Boundary>
    </div>
  )
}

// --- SEO Reports ------------------------------------------------------------

function scoreColor(s) {
  if (s == null) return 'text-on-surface-variant'
  if (s >= 90) return 'text-emerald-400'
  if (s >= 50) return 'text-amber-400'
  return 'text-error'
}

function ReportDetail({ reportId, onBack }) {
  const { data: r, loading, error } = useResource(() => fetchSeoReport(reportId), [reportId])
  const rj = r?.report_json || {}
  const ps = rj.pagespeed || null
  const cwv = ps?.cwv || {}
  const audits = Array.isArray(ps?.audits) ? ps.audits : []
  // Extra findings present on Content Agent reports (best-effort).
  const schema = rj.schema || null
  const brokenLinks = Array.isArray(rj.brokenLinks) ? rj.brokenLinks : null
  const known = new Set(['pagespeed', 'synthesis', 'providers', 'generated_at', 'schema', 'brokenLinks'])
  const extraKeys = Object.keys(rj).filter((k) => !known.has(k))

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" className="text-base" /> Back to reports
      </button>
      <Boundary loading={loading} error={error}>
        {r && (
          <div className="space-y-4">
            <div>
              <p className="section-label">SEO / GEO report</p>
              <h2 className="mt-1 font-display text-2xl gold-shine">{r.domain}</h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{(r.generated_at || '').slice(0, 10)}</p>
            </div>

            {rj.synthesis && (
              <div className="glass-card p-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="section-label">Executive summary</p>
                  <CopyButton text={rj.synthesis} />
                </div>
                <Markdown>{rj.synthesis}</Markdown>
              </div>
            )}

            {ps && (
              <>
                <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    ['Performance', ps.performance],
                    ['SEO', ps.seo],
                    ['Accessibility', ps.accessibility],
                    ['Best practices', ps.bestPractices],
                  ].map(([label, score]) => (
                    <div key={label} className="glass-card p-5 text-center">
                      <p className="section-label">{label}</p>
                      <p className={`mt-2 font-display text-3xl ${scoreColor(score)}`}>{score ?? '—'}</p>
                    </div>
                  ))}
                </section>

                <section className="glass-card p-6">
                  <p className="section-label mb-3">Core Web Vitals</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="font-display text-2xl">{cwv.lcpMs != null ? `${(cwv.lcpMs / 1000).toFixed(2)}s` : '—'}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">LCP</p></div>
                    <div><p className="font-display text-2xl">{cwv.inpMs != null ? `${Math.round(cwv.inpMs)}ms` : '—'}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">INP</p></div>
                    <div><p className="font-display text-2xl">{cwv.clsValue != null ? Number(cwv.clsValue).toFixed(3) : '—'}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">CLS</p></div>
                  </div>
                </section>

                {audits.length > 0 && (
                  <section className="glass-card p-6">
                    <p className="section-label mb-3">Opportunities ({audits.length})</p>
                    <ul className="space-y-2">
                      {audits.map((a) => (
                        <li key={a.id} className="flex items-start justify-between gap-3 border-b border-outline/40 pb-2 text-sm last:border-0">
                          <span className="text-on-surface/90">{a.title || a.id}</span>
                          {a.displayValue && <span className="shrink-0 font-mono text-xs text-on-surface-variant">{a.displayValue}</span>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            {(schema || brokenLinks) && (
              <section className="grid gap-4 md:grid-cols-2">
                {schema && (
                  <div className="glass-card p-6">
                    <p className="section-label mb-2">Structured data</p>
                    <p className="text-sm text-on-surface-variant">{schema.itemCount ?? schema.count ?? 0} schema items{schema.hasFAQPage ? ' · FAQ' : ''}{schema.hasArticle ? ' · Article' : ''}</p>
                  </div>
                )}
                {brokenLinks && (
                  <div className="glass-card p-6">
                    <p className="section-label mb-2">Broken links</p>
                    <p className="text-sm text-on-surface-variant">{brokenLinks.filter((b) => !b.ok).length} broken of {brokenLinks.length} checked</p>
                  </div>
                )}
              </section>
            )}

            {extraKeys.length > 0 && (
              <details className="glass-card p-5">
                <summary className="cursor-pointer text-sm text-on-surface-variant">Raw report data</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-on-surface-variant">{JSON.stringify(Object.fromEntries(extraKeys.map((k) => [k, rj[k]])), null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </Boundary>
    </div>
  )
}

function ReportsSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => fetchSeoReports(clientId), [clientId])
  const [selected, setSelected] = useState(null)

  if (selected) return <ReportDetail reportId={selected} onBack={() => setSelected(null)} />

  return (
    <div className="space-y-4">
      <JobRunner
        step="Step 1"
        label="Domain to analyze"
        placeholder="https://example.com or example.com"
        buttonText="Run report"
        icon="assessment"
        initialValue={data?.website || ''}
        hint="Runs Google PageSpeed Insights and writes a Claude-summarised audit."
        onRun={async (domain) => {
          await requestSeoReport(clientId, domain)
          await reload()
        }}
      />
      <h3 className="section-label mt-2">Past reports</h3>
      <Boundary
        loading={loading}
        error={error}
        empty={data && data.reports.length === 0}
        emptyTitle="No audits run yet"
        emptyHint="Run a report above to see audit history here."
      >
        {data && data.reports.length > 0 && (
          <ul className="glass-card divide-y divide-outline overflow-hidden p-0">
            {data.reports.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low"
                >
                  <div>
                    <p className="font-display text-lg">{r.domain}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                      {(r.generated_at || '').slice(0, 10)}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-primary">
                      {r.usage_billed ? 'ready' : 'draft'}
                    </span>
                    <Icon name="chevron_right" className="text-on-surface-variant text-base" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Boundary>
    </div>
  )
}

// --- Site Analysis ----------------------------------------------------------

function AnalysisSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => fetchSiteAnalysis(clientId), [clientId])
  const a = data?.analysis
  const { summary, items } = flattenRecommendations(a?.recommendations)
  const rankings = Array.isArray(a?.current_rankings) ? a.current_rankings : []

  return (
    <div className="space-y-4">
      <JobRunner
        step="Step 1"
        label="Domain to analyze"
        placeholder="https://example.com or example.com"
        buttonText="Run new analysis"
        icon="query_stats"
        initialValue={data?.website || a?.domain || ''}
        hint="Pulls the keywords the domain already ranks for, then a Claude strategist recommends what to target next."
        onRun={async (domain) => {
          await requestSiteAnalysis(clientId, domain)
          await reload()
        }}
      />

      <Boundary
        loading={loading}
        error={error}
        empty={data && !a}
        emptyTitle="No site analysis yet"
        emptyHint="Run an analysis above to see rankings and a recommended strategy."
      >
        {a && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  {(a.generated_at || '').slice(0, 10)} · {prettyStatus(a.status)}
                </p>
                <h2 className="mt-1 font-display text-2xl gold-shine">{a.domain}</h2>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${
                  a.status === 'succeeded' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-error/40 bg-error/10 text-error'
                }`}
              >
                {prettyStatus(a.status)}
              </span>
            </div>

            {a.error && (
              <div className="glass-card p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-error">Failed</p>
                <p className="mt-2 text-sm text-on-surface-variant">{a.error}</p>
              </div>
            )}

            {summary && (
              <div className="glass-card p-6">
                <p className="section-label mb-2">Strategist’s read</p>
                <p className="text-base leading-relaxed">{summary}</p>
              </div>
            )}

            {items.length > 0 && (
              <div>
                <h3 className="section-label mb-3">Recommended keywords ({items.length})</h3>
                <ul className="space-y-3">
                  {items.map((r, i) => (
                    <li key={i} className="glass-card p-5">
                      <h4 className="font-display text-xl">{r.title}</h4>
                      {r.detail && <p className="mt-2 text-sm text-on-surface-variant">{r.detail}</p>}
                      {r.impact && (
                        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                          <span className={`rounded-full border px-2 py-0.5 ${impactStyle(r.impact)}`}>{prettyStatus(r.impact)} impact</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rankings.length > 0 && (
              <details className="glass-card p-5">
                <summary className="cursor-pointer text-sm text-on-surface-variant">Show top {rankings.length} current rankings</summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline text-left">
                        {['keyword', 'rank', 'volume', 'diff'].map((h) => (
                          <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((r, i) => (
                        <tr key={i} className="border-b border-outline/40">
                          <td className="px-3 py-2 text-on-surface/90">{r.keyword}</td>
                          <td className="px-3 py-2 tabular-nums text-on-surface-variant">{r.rank ?? '—'}</td>
                          <td className="px-3 py-2 tabular-nums text-on-surface-variant">{r.volume ?? '—'}</td>
                          <td className="px-3 py-2 tabular-nums text-on-surface-variant">{r.difficulty ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
        )}
      </Boundary>
    </div>
  )
}

// --- Watchlist (local per-client seo_keywords) ------------------------------

function WatchlistSection({ clientId, clientName }) {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setKeywords(await fetchKeywords(clientId))
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [clientId])
  useEffect(() => {
    load()
  }, [load])

  async function addKeyword(e) {
    e.preventDefault()
    if (!keyword.trim()) return
    setBusy(true)
    try {
      await createKeyword(clientId, { keyword: keyword.trim(), target_url: targetUrl.trim() })
      setKeyword('')
      setTargetUrl('')
      load()
    } catch (e2) {
      setError(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="glass-card lg:col-span-8 overflow-hidden">
        <div className="p-6 border-b border-outline flex items-center justify-between gap-4">
          <div>
            <p className="section-label mb-1">Manual watchlist</p>
            <p className="text-sm text-on-surface-variant">Target keywords for {clientName} — tracked in Mission Control.</p>
          </div>
          {loading && <Icon name="progress_activity" className="animate-spin text-primary" />}
        </div>
        {error && <p className="px-6 py-3 text-sm text-error border-b border-outline">{error}</p>}
        {keywords.length === 0 && !loading ? (
          <p className="text-sm text-on-surface-variant py-10 text-center px-6">No keywords tracked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-outline">
                <tr>
                  {['keyword', 'target url', 'added', ''].map((h) => (
                    <th key={h} className="p-5 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/50">
                {keywords.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-container-low">
                    <td className="p-5">
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-sm text-primary">{k.keyword}</span>
                    </td>
                    <td className="p-5 text-sm text-on-surface-variant">{k.target_url || '—'}</td>
                    <td className="p-5 font-mono text-xs text-on-surface-variant">{(k.created_at || '').slice(0, 10)}</td>
                    <td className="p-5 text-right">
                      <button onClick={() => deleteKeyword(k.id).then(load)} className="text-on-surface-variant hover:text-error" aria-label={`Remove ${k.keyword}`}>
                        <Icon name="delete" className="text-base" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 space-y-4">
        <div className="glass-card p-6">
          <p className="section-label">Keywords tracked</p>
          <h3 className="font-display text-4xl mt-2 text-primary">{keywords.length}</h3>
        </div>
        <form onSubmit={addKeyword} className="glass-card p-6 space-y-4">
          <p className="section-label">Add keyword</p>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. dental implants utah" className="input-field" />
          <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="/services/implants (optional)" className="input-field" />
          <button type="submit" disabled={busy || !keyword.trim()} className="btn-primary w-full">
            {busy ? 'Adding…' : 'Track keyword'}
          </button>
        </form>
      </div>
    </section>
  )
}

// --- Draft Editor (open a draft: read/edit content, approve/schedule) --------

const DRAFT_ACTIONS = [
  { key: 'approve', label: 'Approve', icon: 'check_circle', status: 'approved', cls: 'btn-primary' },
  { key: 'request_revision', label: 'Request revision', icon: 'rate_review', status: 'needs_revision', cls: 'btn-secondary' },
  { key: 'reject', label: 'Reject', icon: 'cancel', status: 'failed', cls: 'btn-secondary' },
  { key: 'resubmit', label: 'Resubmit', icon: 'replay', status: 'pending_approval', cls: 'btn-secondary' },
]

// Which Mammoth client is wired to publish into the public marketing site.
// Must match the main-site server config (MAIN_SITE_CLIENT_ID, default below).
const MAIN_SITE_CLIENT_ID = 'disruptors-media'

function DraftEditor({ draftId, onBack }) {
  const { data: draft, loading, error, reload } = useResource(() => fetchDraft(draftId), [draftId])
  const { data: trail, reload: reloadTrail } = useResource(() => fetchApprovals(draftId), [draftId])
  const { activeClient } = useClient()
  const [text, setText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(false)
  const [liveUrl, setLiveUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageBusy, setImageBusy] = useState(false)
  const toast = useToastShow()

  // "Publish to main website" is only for the DisruptorsMedia client, and only
  // once a draft is approved (Mammoth's approval is the gate — it goes live
  // immediately on the public site).
  const canPublishMainSite = activeClient?.id === MAIN_SITE_CLIENT_ID
  const isApproved = draft && ['approved', 'published'].includes(draft.status)

  async function publishMainSite() {
    setBusy(true)
    try {
      const result = await publishToMainSite(draftId)
      setLiveUrl(result.url)
      await reload()
      toast('Published to disruptorsmedia.com', 'rocket_launch')
    } catch (e) {
      toast(String(e?.message || e), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function generateImage() {
    setImageBusy(true)
    try {
      const { url } = await generateDraftImage(draftId, imagePrompt.trim() || undefined)
      setImageUrl(url)
      await reload()
      toast('Featured image generated', 'image')
    } catch (e) {
      toast(String(e?.message || e), 'error')
    } finally {
      setImageBusy(false)
    }
  }

  useEffect(() => {
    if (draft) {
      setText(draft.humanized ?? draft.original ?? '')
      // Show an already-attached public image (http URL); ignore legacy non-URL paths.
      const img = draft.image_storage_path
      setImageUrl(img && /^https?:\/\//i.test(img) ? img : '')
    }
  }, [draft])

  async function save() {
    setBusy(true)
    try {
      await saveDraftHumanized(draftId, text)
      setDirty(false)
      await reload()
      toast('Draft saved', 'check_circle')
    } finally {
      setBusy(false)
    }
  }

  async function act(a) {
    setBusy(true)
    try {
      await setDraftStatus(draftId, a.status)
      await addApproval(draft.client_id, draftId, a.key, note)
      setNote('')
      await reload()
      await reloadTrail()
      toast(`Draft marked ${prettyStatus(a.status)}`, 'check_circle')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" className="text-base" /> Back to drafts
      </button>

      <Boundary loading={loading} error={error}>
        {draft && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Editor */}
            <div className="lg:col-span-8 space-y-4">
              <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="section-label mb-1">{prettyStatus(draft.content_type)}</p>
                    <h2 className="font-display text-2xl gold-shine truncate">{draft.topic || 'Untitled draft'}</h2>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-mono uppercase ${draftStatusStyle(draft.status)}`}>
                    {prettyStatus(draft.status)}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex rounded-lg border border-outline p-0.5">
                    <button onClick={() => setPreview(false)} className={`rounded-md px-3 py-1 text-xs ${!preview ? 'bg-primary/15 text-primary' : 'text-on-surface-variant'}`}>Edit</button>
                    <button onClick={() => setPreview(true)} className={`rounded-md px-3 py-1 text-xs ${preview ? 'bg-primary/15 text-primary' : 'text-on-surface-variant'}`}>Preview</button>
                  </div>
                  <div className="ml-auto"><CopyButton text={text} /></div>
                </div>
                {preview ? (
                  <div className="mt-3 max-h-[34rem] overflow-y-auto rounded-lg border border-outline bg-surface-container-low p-4">
                    <Markdown>{text}</Markdown>
                  </div>
                ) : (
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      setDirty(true)
                    }}
                    rows={22}
                    className="input-field mt-3 font-mono text-sm leading-relaxed"
                  />
                )}
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={save} disabled={!dirty || busy} className="btn-primary">
                    <Icon name="save" className="text-base" /> {busy ? 'Saving…' : 'Save changes'}
                  </button>
                  {dirty && <span className="text-xs text-on-surface-variant">Unsaved edits</span>}
                  <span className="ml-auto text-xs tabular-nums text-on-surface-variant">{dollars(draft.cost_cents)} · {draft.model}</span>
                </div>
              </div>
            </div>

            {/* Workflow */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass-card p-6 space-y-3">
                <p className="section-label">Workflow</p>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="input-field" />
                <div className="grid grid-cols-1 gap-2">
                  {DRAFT_ACTIONS.map((a) => (
                    <button key={a.key} onClick={() => act(a)} disabled={busy} className={`${a.cls} w-full`}>
                      <Icon name={a.icon} className="text-base" /> {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Publish to the public marketing site — DisruptorsMedia only. */}
              {canPublishMainSite && (
                <div className="glass-card p-6 space-y-3">
                  <p className="section-label">Main website</p>
                  <p className="text-xs text-on-surface-variant">
                    Publish this draft to disruptorsmedia.com. It goes live immediately. Re-publishing updates the same post.
                  </p>

                  {/* Featured image — generate one to attach as the post hero. */}
                  <div className="space-y-2 rounded-lg border border-outline p-3">
                    <p className="text-xs font-medium">Featured image</p>
                    {imageUrl ? (
                      <img src={imageUrl} alt="Featured" className="aspect-video w-full rounded-md object-cover" loading="lazy" />
                    ) : (
                      <p className="text-xs text-on-surface-variant">
                        No image yet. Generate one, or publish without it.
                      </p>
                    )}
                    <input
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Image prompt (optional — defaults to the topic)"
                      className="input-field text-xs"
                    />
                    <button onClick={generateImage} disabled={imageBusy} className="btn-secondary w-full">
                      <Icon name={imageBusy ? 'progress_activity' : 'image'} className={`text-base ${imageBusy ? 'animate-spin' : ''}`} />
                      {imageBusy ? 'Generating…' : imageUrl ? 'Regenerate image' : 'Generate image'}
                    </button>
                  </div>

                  <button
                    onClick={publishMainSite}
                    disabled={busy || !isApproved}
                    title={isApproved ? '' : 'Approve the draft first'}
                    className="btn-primary w-full"
                  >
                    <Icon name="rocket_launch" className="text-base" /> {busy ? 'Publishing…' : 'Publish to main website'}
                  </button>
                  {!isApproved && <p className="text-xs text-on-surface-variant">Approve the draft to enable publishing.</p>}
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Icon name="open_in_new" className="text-base" /> View live post
                    </a>
                  )}
                </div>
              )}

              <div className="glass-card p-6">
                <p className="section-label mb-3">Approval trail</p>
                {!trail || trail.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No actions yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {trail.map((t) => (
                      <li key={t.id} className="text-sm">
                        <span className="font-medium">{prettyStatus(t.action)}</span>
                        <span className="text-on-surface-variant"> · {(t.created_at || '').slice(0, 10)}</span>
                        {t.note && <p className="text-xs text-on-surface-variant">{t.note}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Boundary>
    </div>
  )
}

// --- Knowledge Base ---------------------------------------------------------

const KB_FIELDS = [
  { key: 'case_studies', label: 'Case studies', hint: 'Client wins, outcomes, tactics.' },
  { key: 'brand_voice_samples', label: 'Brand voice samples', hint: '1–3 examples of on-brand writing.' },
  { key: 'brand_guidelines', label: 'Brand guidelines', hint: 'Tone rules, vocabulary, do/don’t.' },
  { key: 'unique_facts', label: 'Unique facts & stories', hint: 'Founder story, proprietary insights.' },
  { key: 'faq', label: 'FAQ', hint: 'Common questions and answers.' },
  { key: 'notes', label: 'Notes', hint: 'Promotions, banned topics, jargon.' },
]

function KnowledgeBaseSection({ clientId }) {
  const { data, loading, error, reload } = useResource(
    () => Promise.all([fetchKnowledgeBase(clientId), fetchBrandVoice(clientId)]),
    [clientId],
  )
  const [kb, setKb] = useState({})
  const [voice, setVoice] = useState({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const toast = useToastShow()

  useEffect(() => {
    if (data) {
      setKb(data[0] || {})
      setVoice(data[1] || {})
    }
  }, [data])

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    setSaveErr(null)
    try {
      await saveKnowledgeBase(clientId, {
        case_studies: kb.case_studies || '',
        brand_voice_samples: kb.brand_voice_samples || '',
        brand_guidelines: kb.brand_guidelines || '',
        unique_facts: kb.unique_facts || '',
        faq: kb.faq || '',
        notes: kb.notes || '',
      })
      await saveBrandVoice(clientId, {
        voice_tone: voice.voice_tone || '',
        target_audience: voice.target_audience || '',
        sample_copy: voice.sample_copy || '',
      })
      setSaved(true)
      toast('Knowledge base saved', 'check_circle')
      await reload()
    } catch (e2) {
      setSaveErr(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Boundary loading={loading} error={error}>
      <form onSubmit={save} className="space-y-4">
        <div className="glass-card p-6 space-y-4">
          <p className="section-label">Brand voice</p>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={voice.voice_tone || ''} onChange={(e) => setVoice({ ...voice, voice_tone: e.target.value })} placeholder="Voice & tone (e.g. confident, plain-spoken)" className="input-field" />
            <input value={voice.target_audience || ''} onChange={(e) => setVoice({ ...voice, target_audience: e.target.value })} placeholder="Target audience" className="input-field" />
          </div>
          <textarea value={voice.sample_copy || ''} onChange={(e) => setVoice({ ...voice, sample_copy: e.target.value })} rows={3} placeholder="Sample of the brand's voice to emulate…" className="input-field" />
        </div>

        {KB_FIELDS.map((f) => (
          <div key={f.key} className="glass-card p-6">
            <p className="section-label">{f.label}</p>
            <p className="mb-2 text-xs text-on-surface-variant">{f.hint}</p>
            <textarea value={kb[f.key] || ''} onChange={(e) => setKb({ ...kb, [f.key]: e.target.value })} rows={4} className="input-field" />
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            <Icon name="save" className="text-base" /> {busy ? 'Saving…' : 'Save knowledge base'}
          </button>
          {saved && <span className="text-sm text-emerald-300">Saved.</span>}
          {saveErr && <span className="text-sm text-error">{saveErr}</span>}
        </div>
      </form>
    </Boundary>
  )
}

// --- Blog Studio (import existing posts as drafts) --------------------------

function BlogStudioSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => fetchDrafts(clientId, 'all'), [clientId])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const imported = (data?.rows ?? []).filter((d) => d.content_type)

  async function onFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(true)
    setMsg(null)
    try {
      let n = 0
      for (const file of files) {
        const body = await file.text()
        const topic = file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ')
        await importDraft(clientId, { topic, contentType: 'blog_post', body })
        n++
      }
      setMsg(`Imported ${n} post${n === 1 ? '' : 's'} into Drafts (pending approval).`)
      await reload()
    } catch (e2) {
      setMsg(e2.message ?? String(e2))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Import</span>
          <p className="section-label">Bring existing posts in as drafts</p>
        </div>
        <label className="btn-primary cursor-pointer inline-flex">
          <Icon name={busy ? 'progress_activity' : 'upload_file'} className={`text-base ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Importing…' : 'Choose .md / .txt files'}
          <input type="file" multiple accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={onFiles} className="hidden" />
        </label>
        {msg && <p className="mt-3 text-sm text-on-surface-variant">{msg}</p>}
        <p className="mt-2 text-xs text-on-surface-variant">Each file becomes a draft you can edit and approve in the Drafts tab.</p>
      </div>

      <Boundary loading={loading} error={error} empty={data && imported.length === 0} emptyTitle="Nothing imported yet" emptyHint="Upload markdown or text files above.">
        {imported.length > 0 && (
          <ul className="glass-card divide-y divide-outline overflow-hidden p-0">
            {imported.slice(0, 30).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="truncate text-sm">{d.topic}</span>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase ${draftStatusStyle(d.status)}`}>{prettyStatus(d.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </Boundary>
    </div>
  )
}

// --- Prompt Studio ----------------------------------------------------------

function PromptStudioSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => fetchPromptTemplates(clientId), [clientId])
  const [type, setType] = useState('blog_post')
  const [template, setTemplate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const forType = (data ?? []).filter((t) => t.content_type === type)
  const active = forType.find((t) => t.is_active)

  async function create(activate) {
    if (!template.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      await createPromptTemplate(clientId, { content_type: type, template: template.trim(), notes: notes.trim(), activate })
      setTemplate('')
      setNotes('')
      await reload()
    } catch (e) {
      setErr(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {DRAFT_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`nav-pill ${type === t ? 'active' : ''}`}>
            {prettyStatus(t)}
          </button>
        ))}
      </nav>

      <Boundary loading={loading} error={error}>
        <div className="space-y-4">
          <div className="glass-card p-6">
            <p className="section-label mb-2">Active prompt · {prettyStatus(type)}</p>
            {active ? (
              <>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">v{active.version}</p>
                <pre className="whitespace-pre-wrap text-sm text-on-surface-variant">{active.template}</pre>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">No active template — the built-in default is used for generation. Create one below to override it.</p>
            )}
          </div>

          <div className="glass-card p-6 space-y-3">
            <p className="section-label">New version</p>
            <p className="text-xs text-on-surface-variant">Use <code className="text-primary">{'{topic}'}</code> and <code className="text-primary">{'{brand_name}'}</code> as placeholders.</p>
            <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={8} placeholder="Write the generation instruction for this content type…" className="input-field font-mono text-sm" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input-field" />
            {err && <p className="text-sm text-error">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => create(true)} disabled={busy || !template.trim()} className="btn-primary">Save &amp; activate</button>
              <button onClick={() => create(false)} disabled={busy || !template.trim()} className="btn-secondary">Save as draft</button>
            </div>
          </div>

          {forType.length > 0 && (
            <div className="glass-card overflow-hidden p-0">
              <p className="section-label p-5 pb-0">Version history</p>
              <ul className="divide-y divide-outline/50 mt-2">
                {forType.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        v{t.version} {t.is_active && <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase text-primary">active</span>}
                        {t.client_id === null && <span className="ml-2 text-[10px] font-mono uppercase text-on-surface-variant">global</span>}
                      </p>
                      {t.notes && <p className="truncate text-xs text-on-surface-variant">{t.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!t.is_active && t.client_id !== null && (
                        <button onClick={() => activatePromptTemplate(clientId, t.id, type).then(reload)} className="btn-secondary px-3 py-1.5 text-xs">Activate</button>
                      )}
                      {!t.is_active && t.client_id !== null && (
                        <button onClick={() => deletePromptTemplate(t.id).then(reload)} className="text-on-surface-variant hover:text-error" aria-label="Delete">
                          <Icon name="delete" className="text-base" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Boundary>
    </div>
  )
}

// --- AI Content Agent (chat personas) ---------------------------------------

const AGENTS = [
  { id: 'assistant', name: 'Content Assistant', system: 'You are a versatile content assistant. Help with any content task clearly and concisely.' },
  { id: 'ideas', name: 'Idea Generator', system: 'You are a content idea generator. Produce specific, original, on-brand content ideas with angles and hooks.' },
  { id: 'seo', name: 'SEO Optimizer', system: 'You are an SEO optimizer. Improve content for search intent, keywords, structure, and readability without keyword stuffing.' },
  { id: 'blog', name: 'Blog Writer', system: 'You are a blog writer. Produce well-structured, engaging long-form posts with clear sections.' },
  { id: 'social', name: 'Social Media Writer', system: 'You are a social media writer. Produce punchy, platform-appropriate posts with strong hooks.' },
  { id: 'email', name: 'Email Specialist', system: 'You are an email marketing specialist. Write concise emails with a strong subject line and one clear call to action.' },
  { id: 'linkedin', name: 'LinkedIn Creator', system: 'You are a LinkedIn content creator. Write professional, insight-led posts that drive engagement.' },
]

function AiAgentSection({ clientId }) {
  const [agentId, setAgentId] = useState('assistant')
  const agent = AGENTS.find((a) => a.id === agentId) || AGENTS[0]
  const [convos, setConvos] = useState([])
  const [convId, setConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [context, setContext] = useState('')

  // Load brand voice + KB once to ground the persona.
  useEffect(() => {
    Promise.all([fetchBrandVoice(clientId), fetchKnowledgeBase(clientId)])
      .then(([v, k]) => {
        const bits = []
        if (v?.voice_tone) bits.push(`Brand voice/tone: ${v.voice_tone}`)
        if (v?.target_audience) bits.push(`Audience: ${v.target_audience}`)
        if (k?.brand_guidelines) bits.push(`Brand guidelines:\n${k.brand_guidelines}`)
        if (k?.unique_facts) bits.push(`Unique facts:\n${k.unique_facts}`)
        setContext(bits.join('\n\n'))
      })
      .catch(() => setContext(''))
  }, [clientId])

  const loadConvos = useCallback(() => {
    listConversations(clientId, agent.name).then(setConvos).catch(() => setConvos([]))
  }, [clientId, agent.name])
  useEffect(() => {
    loadConvos()
    setConvId(null)
    setMessages([])
  }, [loadConvos])

  function openConvo(c) {
    setConvId(c.id)
    setMessages(Array.isArray(c.messages) ? c.messages : [])
  }
  function newChat() {
    setConvId(null)
    setMessages([])
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || busy) return
    const next = [...messages, { role: 'user', content: input.trim() }]
    setMessages(next)
    setInput('')
    setBusy(true)
    setErr(null)
    try {
      const system = [agent.system, context && `Use this brand context where relevant:\n${context}`].filter(Boolean).join('\n\n')
      const reply = await chatComplete({ system, messages: next })
      const withReply = [...next, { role: 'assistant', content: reply }]
      setMessages(withReply)
      const title = next[0]?.content?.slice(0, 60) || 'New chat'
      const saved = await saveConversation(clientId, { id: convId, agent_name: agent.name, title, messages: withReply })
      if (!convId) setConvId(saved.id)
      loadConvos()
    } catch (e2) {
      setErr(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left rail: agent + history */}
      <div className="lg:col-span-4 space-y-4">
        <div className="glass-card p-5 space-y-3">
          <p className="section-label">Agent</p>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="input-field">
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button onClick={newChat} className="btn-secondary w-full"><Icon name="add" className="text-base" /> New chat</button>
        </div>
        <div className="glass-card p-5">
          <p className="section-label mb-3">History</p>
          {convos.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {convos.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <button onClick={() => openConvo(c)} className={`flex-1 truncate text-left text-sm py-1.5 ${convId === c.id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    {c.title}
                  </button>
                  <button onClick={() => deleteConversation(c.id).then(loadConvos)} className="text-on-surface-variant hover:text-error" aria-label="Delete chat">
                    <Icon name="delete" className="text-sm" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat thread */}
      <div className="lg:col-span-8">
        <div className="glass-card flex flex-col" style={{ minHeight: '60vh' }}>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chat with the {agent.name}. Your brand voice &amp; knowledge base are included automatically.</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${m.role === 'user' ? 'whitespace-pre-wrap text-sm bg-primary/15 text-on-surface' : 'bg-surface-container-low'}`}>
                    {m.role === 'user' ? (
                      m.content
                    ) : (
                      <>
                        <Markdown>{m.content}</Markdown>
                        <div className="mt-1.5 border-t border-outline/40 pt-1.5">
                          <CopyButton text={m.content} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            {busy && <p className="text-sm text-on-surface-variant"><Icon name="progress_activity" className="animate-spin text-base align-middle" /> Thinking…</p>}
            {err && <p className="text-sm text-error">{err}</p>}
          </div>
          <form onSubmit={send} className="flex items-end gap-2 border-t border-outline p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(e)
                }
              }}
              rows={2}
              placeholder="Message the agent…  (Enter to send, Shift+Enter for newline)"
              className="input-field flex-1 resize-none"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary"><Icon name="send" className="text-base" /></button>
          </form>
        </div>
      </div>
    </div>
  )
}

// --- AI Images --------------------------------------------------------------

function ImagesSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => listImages(clientId), [clientId])
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const toast = useToastShow()

  async function generate(e) {
    e.preventDefault()
    if (!prompt.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      const { dataUrl } = await requestImage(clientId, prompt.trim())
      await saveImage(clientId, prompt.trim(), dataUrl)
      setPrompt('')
      await reload()
      toast('Image generated', 'check_circle')
    } catch (e2) {
      setErr(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={generate} className="glass-card p-6">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Generate</span>
          <p className="section-label">Create a brand image</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image — e.g. a modern HVAC van, gold-and-black brand style" className="input-field flex-1 min-w-[260px]" />
          <button type="submit" disabled={busy || !prompt.trim()} className="btn-primary">
            <Icon name={busy ? 'progress_activity' : 'auto_awesome'} className={`text-base ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Generating…' : 'Generate image'}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-error">{err}</p>}
        <p className="mt-2 text-xs text-on-surface-variant">Requires OPENAI_API_KEY on the server.</p>
      </form>

      <Boundary loading={loading} error={error} empty={data && data.length === 0} emptyTitle="No images yet" emptyHint="Generate one above.">
        {data && data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((img) => (
              <div key={img.id} className="glass-card overflow-hidden">
                <img src={img.storage_path} alt={img.prompt} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="line-clamp-2 text-xs text-on-surface-variant">{img.prompt}</p>
                  <button onClick={() => deleteImage(img.id).then(reload)} className="mt-2 text-on-surface-variant hover:text-error" aria-label="Delete image">
                    <Icon name="delete" className="text-base" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Boundary>
    </div>
  )
}

// --- Settings ---------------------------------------------------------------

const BYOK_PROVIDERS = ['claude', 'openai', 'dataforseo', 'serpapi', 'apify', 'kie', 'wordpress']

function SettingsSection({ clientId }) {
  const { data, loading, error, reload } = useResource(
    () => Promise.all([fetchClientSettings(clientId), fetchBrandVoice(clientId), listApiKeys(clientId)]),
    [clientId],
  )
  const { activeClient, removeClient } = useClient()
  const [cfg, setCfg] = useState({})
  const [voice, setVoice] = useState({})
  const [competitors, setCompetitors] = useState(['', '', ''])
  const [keys, setKeys] = useState({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const toast = useToastShow()

  async function deleteClient() {
    if (confirmName.trim() !== (activeClient?.name || '')) return
    setDeleting(true)
    try {
      await removeClient(clientId)
      // ClientContext switches to another client and the page re-renders.
    } catch (e2) {
      setErr(e2.message ?? String(e2))
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (data) {
      setCfg(data[0] || {})
      setVoice(data[1] || {})
      const comp = data[0]?.competitor_domains || []
      setCompetitors([comp[0] || '', comp[1] || '', comp[2] || ''])
    }
  }, [data])

  const savedProviders = new Set((data?.[2] || []).map((k) => k.provider))

  async function saveConfig(e) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    setErr(null)
    try {
      await saveClientSettings(clientId, {
        wordpress_url: cfg.wordpress_url || '',
        auto_publish_on_approval: !!cfg.auto_publish_on_approval,
        competitor_domains: competitors.map((c) => c.trim()).filter(Boolean),
        plan: cfg.plan || null,
        token_allowance: Number(cfg.token_allowance) || 0,
      })
      await saveBrandVoice(clientId, {
        voice_tone: voice.voice_tone || '',
        target_audience: voice.target_audience || '',
        sample_copy: voice.sample_copy || '',
      })
      setSaved(true)
      toast('Settings saved', 'check_circle')
      await reload()
    } catch (e2) {
      setErr(e2.message ?? String(e2))
    } finally {
      setBusy(false)
    }
  }

  async function saveKey(provider) {
    const secret = (keys[provider] || '').trim()
    if (!secret) return
    await saveApiKey(clientId, provider, secret)
    setKeys({ ...keys, [provider]: '' })
    toast(`${provider} key saved`, 'check_circle')
    reload()
  }

  return (
    <Boundary loading={loading} error={error}>
      <div className="space-y-4">
        {/* Workspace — edit client details (moved out of the sidebar switcher) */}
        <div className="glass-card p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">Workspace</p>
            <p className="mt-1 text-sm text-on-surface-variant">{activeClient?.name} — edit name, initials, health and feature access.</p>
          </div>
          <button onClick={() => setShowEdit(true)} className="btn-secondary">
            <Icon name="edit" className="text-base" /> Edit client details
          </button>
        </div>

        <form onSubmit={saveConfig} className="space-y-4">
          <div className="glass-card p-6 space-y-3">
            <p className="section-label">Brand voice</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={voice.voice_tone || ''} onChange={(e) => setVoice({ ...voice, voice_tone: e.target.value })} placeholder="Voice & tone" className="input-field" />
              <input value={voice.target_audience || ''} onChange={(e) => setVoice({ ...voice, target_audience: e.target.value })} placeholder="Target audience" className="input-field" />
            </div>
            <textarea value={voice.sample_copy || ''} onChange={(e) => setVoice({ ...voice, sample_copy: e.target.value })} rows={2} placeholder="Sample copy…" className="input-field" />
          </div>

          <div className="glass-card p-6 space-y-3">
            <p className="section-label">WordPress publishing</p>
            <input value={cfg.wordpress_url || ''} onChange={(e) => setCfg({ ...cfg, wordpress_url: e.target.value })} placeholder="https://yoursite.com" className="input-field" />
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <input type="checkbox" checked={!!cfg.auto_publish_on_approval} onChange={(e) => setCfg({ ...cfg, auto_publish_on_approval: e.target.checked })} />
              Auto-publish drafts to WordPress on approval
            </label>
          </div>

          <div className="glass-card p-6 space-y-3">
            <p className="section-label">Competitor domains</p>
            {competitors.map((c, i) => (
              <input key={i} value={c} onChange={(e) => { const n = [...competitors]; n[i] = e.target.value; setCompetitors(n) }} placeholder={`Competitor ${i + 1}`} className="input-field" />
            ))}
          </div>

          <div className="glass-card p-6 space-y-3">
            <p className="section-label">Plan &amp; budget</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={cfg.plan || ''} onChange={(e) => setCfg({ ...cfg, plan: e.target.value })} className="input-field">
                <option value="">No plan</option>
                {['growth', 'scale', 'mammoth'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" value={cfg.token_allowance ?? 0} onChange={(e) => setCfg({ ...cfg, token_allowance: e.target.value })} placeholder="Monthly token allowance (0 = plan default)" className="input-field" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary"><Icon name="save" className="text-base" /> {busy ? 'Saving…' : 'Save settings'}</button>
            {saved && <span className="text-sm text-emerald-300">Saved.</span>}
            {err && <span className="text-sm text-error">{err}</span>}
          </div>
        </form>

        <div className="glass-card p-6 space-y-3">
          <p className="section-label">API keys (BYOK)</p>
          <p className="text-xs text-on-surface-variant">Per-client overrides for the agency defaults. Stored server-side; only the last 4 digits are shown.</p>
          {BYOK_PROVIDERS.map((p) => (
            <div key={p} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 font-mono text-xs uppercase tracking-[0.15em] text-on-surface-variant">{p}</span>
              <input
                type="password"
                autoComplete="off"
                name={`byok-${p}`}
                value={keys[p] || ''}
                onChange={(e) => setKeys({ ...keys, [p]: e.target.value })}
                placeholder={savedProviders.has(p) ? '•••• saved — enter to replace' : 'Not set'}
                className="input-field flex-1 min-w-[200px]"
              />
              <button onClick={() => saveKey(p)} disabled={!(keys[p] || '').trim()} className="btn-secondary px-3 py-2 text-xs">Save</button>
            </div>
          ))}
        </div>

        {/* Danger zone — delete the client (moved out of the sidebar switcher) */}
        <div className="rounded-xl border border-error/40 bg-error/5 p-6 space-y-3">
          <p className="section-label text-error">Danger zone</p>
          <p className="text-sm text-on-surface-variant">
            Permanently delete <span className="text-on-surface">{activeClient?.name}</span> and all of its data in Mission Control
            (tasks, content, leads, campaigns, keywords, usage). Logins are unlinked, not deleted; external accounts (GoHighLevel,
            socials) are untouched.
          </p>
          <p className="text-xs text-on-surface-variant">
            Type the client name <span className="font-mono text-on-surface">{activeClient?.name}</span> to confirm.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Client name"
              className="input-field flex-1 min-w-[200px]"
            />
            <button
              onClick={deleteClient}
              disabled={deleting || confirmName.trim() !== (activeClient?.name || '')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-error/90 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-error disabled:opacity-50"
            >
              <Icon name="delete_forever" className="text-base" /> {deleting ? 'Deleting…' : 'Delete client'}
            </button>
          </div>
        </div>
      </div>
      {showEdit && activeClient && <NewClientModal client={activeClient} onClose={() => setShowEdit(false)} />}
    </Boundary>
  )
}

// --- page -------------------------------------------------------------------

const SECTION_META = {
  dashboard: { label: 'Overview', title: 'SEO / GEO Dashboard', desc: 'Content, keywords, audits and strategy for this client.' },
  agent: { label: 'Assistant', title: 'AI Content Agent', desc: 'Chat with content personas, grounded in this client’s brand voice.' },
  drafts: { label: 'Content', title: 'Drafts', desc: 'AI-generated content, from queued to published.' },
  keywords: { label: 'Research', title: 'Keywords', desc: 'Opportunities scored by search volume and difficulty.' },
  prompts: { label: 'Config', title: 'Prompt Studio', desc: 'The instructions that drive AI generation, per content type.' },
  images: { label: 'Creative', title: 'AI Images', desc: 'Generate on-brand images for content and social.' },
  settings: { label: 'Workspace', title: 'Settings', desc: 'Brand voice, WordPress, competitors, API keys and plan.' },
  reports: { label: 'Audits', title: 'SEO / GEO Reports', desc: 'PageSpeed + AI-summarised site audits.' },
  analysis: { label: 'Strategy', title: 'Site Analysis', desc: 'What you rank for, and what to target next.' },
  knowledge: { label: 'Brand', title: 'Knowledge Base', desc: 'Brand voice + facts that feed every AI generation.' },
  blog: { label: 'Import', title: 'Blog Studio', desc: 'Bring existing posts in as drafts.' },
  watchlist: { label: 'Tracking', title: 'Keyword Watchlist', desc: 'Manually tracked target keywords.' },
}

// Grouped workspace nav: a vertical rail on desktop, a grouped dropdown on mobile.
function WorkspaceNav({ section, onSelect }) {
  return (
    <>
      <aside className="hidden lg:block w-56 shrink-0">
        <nav className="sticky top-4 space-y-5">
          {NAV_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="section-label px-3 mb-1.5">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((key) => {
                  const s = SECTION_BY_KEY[key]
                  const active = section === key
                  return (
                    <li key={key}>
                      <button
                        onClick={() => onSelect(key)}
                        className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          active ? 'bg-primary/10 text-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                        }`}
                      >
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />}
                        <Icon name={s.icon} filled={active} className="text-base shrink-0" />
                        {s.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:hidden">
        <select value={section} onChange={(e) => onSelect(e.target.value)} className="input-field" aria-label="SEO/GEO section">
          {NAV_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((key) => (
                <option key={key} value={key}>
                  {SECTION_BY_KEY[key].label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </>
  )
}

export default function SeoGeo() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const [section, setSection] = useState('dashboard')
  const slug = activeClient?.id || ''
  const meta = SECTION_META[section]
  const { show, node } = useToast()
  const go = useCallback((key) => setSection(key), [])

  return (
    <>
      <TopBar title="SEO / GEO Strategy" searchPlaceholder="Search SEO/GEO…" onMenu={openNav} />

      <ToastCtx.Provider value={show}>
        <NavCtx.Provider value={go}>
          <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full">
            <div className="flex flex-col gap-6 lg:flex-row">
              <WorkspaceNav section={section} onSelect={go} />

              <div className="min-w-0 flex-1 space-y-6">
                <PageHeader label={meta.label} title={meta.title} description={meta.desc} />

                {/* Active section — keyed by client+section so data reloads on switch */}
                <div key={`${slug}:${section}`}>
                  {!slug ? (
                    <div className="glass-card p-10 text-center">
                      <p className="font-display text-lg">No client selected</p>
                      <p className="mt-2 text-sm text-on-surface-variant">Pick a client in the sidebar to see its SEO/GEO workspace.</p>
                    </div>
                  ) : (
                    <>
                      {section === 'dashboard' && <DashboardSection clientId={slug} />}
                      {section === 'agent' && <AiAgentSection clientId={slug} />}
                      {section === 'drafts' && <DraftsSection clientId={slug} />}
                      {section === 'keywords' && <KeywordsSection clientId={slug} />}
                      {section === 'prompts' && <PromptStudioSection clientId={slug} />}
                      {section === 'images' && <ImagesSection clientId={slug} />}
                      {section === 'settings' && <SettingsSection clientId={slug} />}
                      {section === 'reports' && <ReportsSection clientId={slug} />}
                      {section === 'analysis' && <AnalysisSection clientId={slug} />}
                      {section === 'knowledge' && <KnowledgeBaseSection clientId={slug} />}
                      {section === 'blog' && <BlogStudioSection clientId={slug} />}
                      {section === 'watchlist' && <WatchlistSection clientId={slug} clientName={activeClient.name} />}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {node}
        </NavCtx.Provider>
      </ToastCtx.Provider>
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { useClient } from '../context/ClientContext'
import { fetchKeywords, createKeyword, deleteKeyword } from '../lib/seoKeywords'
import {
  fetchDashboard,
  fetchDrafts,
  fetchCaKeywords,
  fetchSeoReports,
  fetchSiteAnalysis,
  requestDraftGeneration,
  requestKeywordResearch,
  requestSiteAnalysis,
  requestSeoReport,
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
  { key: 'drafts', label: 'Drafts', icon: 'description' },
  { key: 'keywords', label: 'Keywords', icon: 'travel_explore' },
  { key: 'reports', label: 'SEO / GEO', icon: 'assessment' },
  { key: 'analysis', label: 'Site Analysis', icon: 'query_stats' },
  { key: 'watchlist', label: 'Watchlist', icon: 'visibility' },
]

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
function JobRunner({ step, label, placeholder, buttonText, icon, initialValue = '', hint, onRun }) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function run(e) {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await onRun(value.trim())
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

function DashboardSection({ clientId }) {
  const { data, loading, error } = useResource(() => fetchDashboard(clientId), [clientId])
  const spend = useMemo(() => (data?.usage ?? []).reduce((s, u) => s + (u.cost_cents || 0), 0), [data])
  const pipeline = useMemo(() => {
    const counts = {}
    for (const d of data?.drafts ?? []) counts[d.status] = (counts[d.status] || 0) + 1
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return { counts, total }
  }, [data])

  return (
    <Boundary loading={loading} error={error}>
      {data && (
        <div className="space-y-4">
          {/* Scorecards */}
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Scorecard label="Drafts · 30d" value={data.drafts.length} />
            <Scorecard label="Spend · 30d" value={dollars(spend)} sub={`${data.usage.length} events`} />
            <Scorecard label="Top keywords" value={data.keywords.length} />
            <Scorecard label="SEO reports" value={data.seoReports.length} />
          </section>

          {/* Top keywords + latest analysis */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="glass-card p-6">
              <p className="section-label mb-4">Top keyword opportunities</p>
              {data.keywords.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No keyword research yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.keywords.map((k) => (
                    <li
                      key={k.keyword}
                      className="flex items-center justify-between gap-3 rounded-lg border border-outline/60 bg-surface-container-low px-4 py-2.5 text-sm"
                    >
                      <span className="truncate text-on-surface/90">{k.keyword}</span>
                      <span className="font-display text-base tabular-nums text-primary">
                        {k.leverage_score != null ? Number(k.leverage_score).toFixed(1) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-card p-6">
              <p className="section-label mb-4">Latest site analysis</p>
              {data.siteAnalysis ? (
                <>
                  <p className="font-display text-2xl gold-shine">{data.siteAnalysis.domain}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    {(data.siteAnalysis.generated_at || '').slice(0, 10)}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {flattenRecommendations(data.siteAnalysis.recommendations)
                      .items.slice(0, 4)
                      .map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-on-surface-variant">
                          <Icon name="chevron_right" className="text-primary text-base shrink-0" />
                          <span className="truncate">{r.title}</span>
                        </li>
                      ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">No analysis run yet.</p>
              )}
            </div>
          </section>

          {/* Drafts pipeline */}
          <section className="glass-card p-6">
            <p className="section-label mb-4">Drafts pipeline · 30d</p>
            {pipeline.total === 0 ? (
              <p className="text-sm text-on-surface-variant">No drafts in the last 30 days.</p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container-low">
                  {Object.entries(pipeline.counts).map(([status, n]) => (
                    <div
                      key={status}
                      className={PIPELINE_COLORS[status] || 'bg-outline'}
                      style={{ width: `${(n / pipeline.total) * 100}%` }}
                      title={`${prettyStatus(status)}: ${n}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                  {Object.entries(pipeline.counts).map(([status, n]) => (
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
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                        {(j.created_at || '').slice(0, 10)}
                      </p>
                    </div>
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-mono uppercase ${draftStatusStyle(j.status)}`}>
                      {prettyStatus(j.status)}
                    </span>
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

  async function generate(e) {
    e.preventDefault()
    if (!topic.trim() || generating) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await requestDraftGeneration({ clientId, contentType, topic: topic.trim() })
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
    } catch (e2) {
      setGenError(e2.message ?? String(e2))
    } finally {
      setGenerating(false)
    }
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
                className="group relative flex items-center justify-between gap-4 rounded-xl border border-outline bg-surface-container px-5 py-4 transition-all hover:border-outline-variant hover:bg-surface-container-high"
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
  if (score >= 60) return { label: 'high', className: 'border-primary bg-primary text-black' }
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

function ReportsSection({ clientId }) {
  const { data, loading, error, reload } = useResource(() => fetchSeoReports(clientId), [clientId])
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
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low">
                <div>
                  <p className="font-display text-lg">{r.domain}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                    {(r.generated_at || '').slice(0, 10)}
                  </p>
                </div>
                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-primary">
                  {r.usage_billed ? 'ready' : 'draft'}
                </span>
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

// --- page -------------------------------------------------------------------

const SECTION_META = {
  dashboard: { label: 'Overview', title: 'SEO / GEO Dashboard', desc: 'Content, keywords, audits and strategy for this client.' },
  drafts: { label: 'Content', title: 'Drafts', desc: 'AI-generated content, from queued to published.' },
  keywords: { label: 'Research', title: 'Keywords', desc: 'Opportunities scored by search volume and difficulty.' },
  reports: { label: 'Audits', title: 'SEO / GEO Reports', desc: 'PageSpeed + AI-summarised site audits.' },
  analysis: { label: 'Strategy', title: 'Site Analysis', desc: 'What you rank for, and what to target next.' },
  watchlist: { label: 'Tracking', title: 'Keyword Watchlist', desc: 'Manually tracked target keywords.' },
}

export default function SeoGeo() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const [section, setSection] = useState('dashboard')
  const slug = activeClient?.id || ''
  const meta = SECTION_META[section]

  return (
    <>
      <TopBar title="SEO / GEO Strategy" searchPlaceholder="Search SEO/GEO…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-6">
        <PageHeader label={meta.label} title={meta.title} description={meta.desc} />

        {/* Section nav (Content Agent style pills) */}
        <nav className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)} className={`nav-pill ${section === s.key ? 'active' : ''}`}>
              <Icon name={s.icon} filled={section === s.key} className="text-base" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Active section — keyed by client so data reloads on client switch */}
        <div key={slug}>
          {!slug ? (
            <div className="glass-card p-10 text-center">
              <p className="font-display text-lg">No client selected</p>
              <p className="mt-2 text-sm text-on-surface-variant">Pick a client in the sidebar to see its SEO/GEO workspace.</p>
            </div>
          ) : (
            <>
              {section === 'dashboard' && <DashboardSection clientId={slug} />}
              {section === 'drafts' && <DraftsSection clientId={slug} />}
              {section === 'keywords' && <KeywordsSection clientId={slug} />}
              {section === 'reports' && <ReportsSection clientId={slug} />}
              {section === 'analysis' && <AnalysisSection clientId={slug} />}
              {section === 'watchlist' && <WatchlistSection clientId={slug} clientName={activeClient.name} />}
            </>
          )}
        </div>
      </div>
    </>
  )
}

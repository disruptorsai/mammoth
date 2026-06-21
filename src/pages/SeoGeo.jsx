import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { useClient } from '../context/ClientContext'
import { useAuth } from '../context/AuthContext'
import { setContentAgentLink } from '../lib/clients'
import { fetchKeywords, createKeyword, deleteKeyword } from '../lib/seoKeywords'
import {
  fetchCaClients,
  fetchDashboard,
  fetchDrafts,
  fetchCaKeywords,
  fetchSeoReports,
  fetchSiteAnalysis,
  requestDraftGeneration,
  isNotConfigured,
  draftStatusStyle,
  prettyStatus,
  dollars,
  suggestCaClientId,
  flattenRecommendations,
  impactStyle,
} from '../lib/contentAgent'

// The dedicated SEO/GEO web app, surfaced natively here. The "Open full app"
// link still deep-links to it for the write-side tooling (Phase 2).
const CONTENT_AGENT_URL = 'https://content-agent.disruptorsmedia.com/'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'drafts', label: 'Content Drafts', icon: 'description' },
  { key: 'keywords', label: 'Keywords', icon: 'travel_explore' },
  { key: 'reports', label: 'SEO Reports', icon: 'assessment' },
  { key: 'analysis', label: 'Site Analysis', icon: 'query_stats' },
  { key: 'watchlist', label: 'Watchlist', icon: 'visibility' },
]

// Small async-loading hook: reloads whenever `deps` change.
function useResource(fn, deps, enabled = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const reload = useCallback(() => {
    if (!enabled) return
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

// --- shared little UI bits --------------------------------------------------

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <Icon name="progress_activity" className="animate-spin text-primary text-3xl" />
  </div>
)

function StateNote({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-14 px-6">
      <Icon name={icon} className="text-on-surface-variant text-4xl" />
      <h4 className="font-headline-lg text-lg">{title}</h4>
      {children && <p className="text-sm text-on-surface-variant max-w-md">{children}</p>}
    </div>
  )
}

// Renders graceful states for any Content Agent tab. `error` may be a
// not_configured error, which gets its own friendly message.
function CaBoundary({ loading, error, empty, emptyTitle, emptyHint, children }) {
  if (loading) return <Spinner />
  if (error) {
    if (isNotConfigured(error)) {
      return (
        <StateNote icon="cloud_off" title="Content Agent isn’t connected yet">
          Set <code className="font-label-mono text-primary">CONTENT_AGENT_SUPABASE_URL</code> and{' '}
          <code className="font-label-mono text-primary">CONTENT_AGENT_SERVICE_ROLE_KEY</code> on the
          server, then reload.
        </StateNote>
      )
    }
    return (
      <StateNote icon="error" title="Couldn’t load this data">
        {error.message}
      </StateNote>
    )
  }
  if (empty) return <StateNote icon="inbox" title={emptyTitle}>{emptyHint}</StateNote>
  return children
}

function Kpi({ label, value, sub }) {
  return (
    <div className="bento-card p-5 rounded-xl">
      <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
        {label}
      </p>
      <h3 className="font-headline-lg text-3xl mt-2 text-primary">{value}</h3>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  )
}

function Card({ title, children, action }) {
  return (
    <div className="bento-card rounded-xl overflow-hidden">
      <div className="p-5 border-b border-outline flex items-center justify-between gap-3">
        <h3 className="font-headline-lg text-lg">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

// --- tab: Dashboard ---------------------------------------------------------

function DashboardTab({ clientId }) {
  const { data, loading, error } = useResource(() => fetchDashboard(clientId), [clientId])
  const spend = useMemo(
    () => (data?.usage ?? []).reduce((s, u) => s + (u.cost_cents || 0), 0),
    [data],
  )

  return (
    <CaBoundary loading={loading} error={error}>
      {data && (
        <div className="space-y-gutter">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
            <Kpi label="Drafts (30d)" value={data.drafts.length} />
            <Kpi label="Spend (30d)" value={dollars(spend)} sub={`${data.usage.length} events`} />
            <Kpi label="Top keywords" value={data.keywords.length} />
            <Kpi label="SEO reports" value={data.seoReports.length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-7">
              <Card title="Top keyword opportunities">
                {data.keywords.length === 0 ? (
                  <StateNote icon="travel_explore" title="No keyword research yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container-high border-b border-outline">
                        <tr>
                          {['Keyword', 'Volume', 'Difficulty', 'Leverage'].map((h) => (
                            <th key={h} className="p-4 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline">
                        {data.keywords.map((k) => (
                          <tr key={k.keyword} className="hover:bg-surface-variant/30">
                            <td className="p-4 text-sm text-primary font-label-mono">{k.keyword}</td>
                            <td className="p-4 text-sm text-on-surface-variant">{k.volume ?? '—'}</td>
                            <td className="p-4 text-sm text-on-surface-variant">{k.difficulty ?? '—'}</td>
                            <td className="p-4 text-sm text-on-surface-variant">
                              {k.leverage_score != null ? Number(k.leverage_score).toFixed(1) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-gutter">
              <Card title="Latest site analysis">
                {data.siteAnalysis ? (
                  (() => {
                    const { items } = flattenRecommendations(data.siteAnalysis.recommendations)
                    return (
                      <div className="p-5 space-y-3">
                        <p className="text-sm text-on-surface-variant">
                          {data.siteAnalysis.domain} ·{' '}
                          <span className="font-label-mono">
                            {(data.siteAnalysis.generated_at || '').slice(0, 10)}
                          </span>
                        </p>
                        {items.length === 0 ? (
                          <p className="text-sm text-on-surface-variant">No recommendations recorded.</p>
                        ) : (
                          <ul className="space-y-2">
                            {items.slice(0, 5).map((r, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <Icon name="chevron_right" className="text-primary text-base shrink-0" />
                                <span>{r.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <StateNote icon="query_stats" title="No analysis run yet" />
                )}
              </Card>

              <Card title="Recent jobs">
                {data.jobs.length === 0 ? (
                  <StateNote icon="bolt" title="No recent jobs" />
                ) : (
                  <ul className="divide-y divide-outline">
                    {data.jobs.slice(0, 6).map((j) => (
                      <li key={j.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <span className="text-sm">{prettyStatus(j.kind)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-label-mono border ${draftStatusStyle(j.status)}`}>
                          {prettyStatus(j.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </CaBoundary>
  )
}

// --- tab: Content Drafts ----------------------------------------------------

const DRAFT_FILTERS = ['all', 'pending_approval', 'needs_revision', 'approved', 'published', 'failed']
const DRAFT_TYPES = ['blog_post', 'service_page', 'faq', 'product_description', 'email']

function DraftsTab({ clientId }) {
  const [filter, setFilter] = useState('all')
  const { data, loading, error, reload } = useResource(
    () => fetchDrafts(clientId, filter),
    [clientId, filter],
  )
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
      // Inngest async path: poll until the new draft leaves 'generating'.
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
      {/* Generate a draft natively (Claude → content_drafts) */}
      <form onSubmit={generate} className="bento-card rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="flex-1 block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
            New draft topic
          </span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Why local SEO matters for clinics"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Type</span>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="mt-1 w-full sm:w-44 bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {DRAFT_TYPES.map((t) => (
              <option key={t} value={t}>
                {prettyStatus(t)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={generating || !topic.trim()}
          className="shrink-0 gold-gradient text-black font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Icon name="progress_activity" className="animate-spin text-base" /> Generating…
            </>
          ) : (
            <>
              <Icon name="auto_awesome" className="text-base" /> Generate draft
            </>
          )}
        </button>
      </form>
      {genError && <p className="text-sm text-error">{genError}</p>}

      <div className="flex flex-wrap gap-2">
        {DRAFT_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-label-mono border transition-colors ${
              filter === f
                ? 'gold-gradient text-black border-transparent'
                : 'border-outline text-on-surface-variant hover:border-primary'
            }`}
          >
            {prettyStatus(f)} {counts[f] != null && <span className="opacity-70">({counts[f]})</span>}
          </button>
        ))}
      </div>

      <div className="bento-card rounded-xl overflow-hidden">
        <CaBoundary
          loading={loading}
          error={error}
          empty={data && data.rows.length === 0}
          emptyTitle="No drafts here"
          emptyHint="No content drafts match this filter."
        >
          {data && data.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-high border-b border-outline">
                  <tr>
                    {['Topic', 'Type', 'Status', 'Updated', 'Cost'].map((h) => (
                      <th key={h} className="p-4 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {data.rows.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-variant/30">
                      <td className="p-4 text-sm max-w-md truncate">{d.topic || '—'}</td>
                      <td className="p-4 text-sm text-on-surface-variant font-label-mono">
                        {prettyStatus(d.content_type) || '—'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-label-mono border ${draftStatusStyle(d.status)}`}>
                          {prettyStatus(d.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant font-label-mono">
                        {(d.updated_at || '').slice(0, 10)}
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">{dollars(d.cost_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CaBoundary>
      </div>
    </div>
  )
}

// --- tab: Keywords ----------------------------------------------------------

function KeywordsTab({ clientId }) {
  const { data, loading, error } = useResource(() => fetchCaKeywords(clientId), [clientId])
  return (
    <div className="bento-card rounded-xl overflow-hidden">
      <CaBoundary
        loading={loading}
        error={error}
        empty={data && data.rows.length === 0}
        emptyTitle="No keyword research yet"
        emptyHint="Run keyword research in the Content Agent to populate this list."
      >
        {data && data.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high border-b border-outline">
                <tr>
                  {['Keyword', 'Intent', 'Volume', 'Difficulty', 'Leverage'].map((h) => (
                    <th key={h} className="p-4 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {data.rows.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-variant/30">
                    <td className="p-4 text-sm text-primary font-label-mono">{k.keyword}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{k.intent || '—'}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{k.volume ?? '—'}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{k.difficulty ?? '—'}</td>
                    <td className="p-4 text-sm text-on-surface-variant">
                      {k.leverage_score != null ? Number(k.leverage_score).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CaBoundary>
    </div>
  )
}

// --- tab: SEO Reports -------------------------------------------------------

function ReportsTab({ clientId }) {
  const { data, loading, error } = useResource(() => fetchSeoReports(clientId), [clientId])
  return (
    <div className="bento-card rounded-xl overflow-hidden">
      <CaBoundary
        loading={loading}
        error={error}
        empty={data && data.reports.length === 0}
        emptyTitle="No SEO reports yet"
        emptyHint="Generate a report in the Content Agent to see audit history here."
      >
        {data && data.reports.length > 0 && (
          <ul className="divide-y divide-outline">
            {data.reports.map((r) => (
              <li key={r.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">{r.domain}</p>
                  <p className="text-xs text-on-surface-variant font-label-mono">
                    {(r.generated_at || '').slice(0, 10)}
                  </p>
                </div>
                {r.usage_billed && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-label-mono border border-outline text-on-surface-variant">
                    billed
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CaBoundary>
    </div>
  )
}

// --- tab: Site Analysis -----------------------------------------------------

function AnalysisTab({ clientId }) {
  const { data, loading, error } = useResource(() => fetchSiteAnalysis(clientId), [clientId])
  const a = data?.analysis
  const { summary, items } = flattenRecommendations(a?.recommendations)
  const rankings = Array.isArray(a?.current_rankings) ? a.current_rankings : []
  return (
    <div className="bento-card rounded-xl">
      <CaBoundary
        loading={loading}
        error={error}
        empty={data && !a}
        emptyTitle="No site analysis yet"
        emptyHint="Run a site analysis in the Content Agent to see rankings and recommendations."
      >
        {a && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-headline-lg text-xl">{a.domain}</h3>
              <p className="text-xs text-on-surface-variant font-label-mono">
                {(a.generated_at || '').slice(0, 10)} · {prettyStatus(a.status)}
              </p>
            </div>

            {a.error && <p className="text-sm text-error">{a.error}</p>}

            {summary && <p className="text-sm text-on-surface-variant max-w-3xl">{summary}</p>}

            {rankings.length > 0 && (
              <div>
                <h4 className="text-sm font-label-mono uppercase tracking-widest text-on-surface-variant mb-3">
                  Current rankings
                </h4>
                <ul className="space-y-1">
                  {rankings.map((r, i) => (
                    <li key={i} className="text-sm">
                      {typeof r === 'string' ? r : `${r.keyword || ''} ${r.rank != null ? `· #${r.rank}` : ''}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-sm font-label-mono uppercase tracking-widest text-on-surface-variant mb-3">
                Recommendations
              </h4>
              {items.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No recommendations recorded.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((r, i) => (
                    <li key={i} className="border border-outline rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-on-surface">{r.title}</span>
                        {r.impact && (
                          <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-label-mono border ${impactStyle(r.impact)}`}>
                            {prettyStatus(r.impact)}
                          </span>
                        )}
                      </div>
                      {r.detail && <p className="text-sm text-on-surface-variant mt-1">{r.detail}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CaBoundary>
    </div>
  )
}

// --- tab: Watchlist (local per-client seo_keywords) -------------------------

function WatchlistTab({ clientId, clientName }) {
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
    setError(null)
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

  async function removeKeyword(id) {
    try {
      await deleteKeyword(id)
      load()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
      <div className="bento-card lg:col-span-8 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-outline flex justify-between items-center gap-4">
          <div>
            <h3 className="font-headline-lg text-xl">Keyword Watchlist</h3>
            <p className="text-sm text-on-surface-variant">
              Manual target keywords for {clientName} — stored in Mission Control.
            </p>
          </div>
          {loading && <Icon name="progress_activity" className="animate-spin text-primary" />}
        </div>

        {error && <p className="px-6 py-3 text-sm text-error border-b border-outline">{error}</p>}

        {keywords.length === 0 && !loading ? (
          <p className="text-sm text-on-surface-variant py-10 text-center px-6">
            No keywords tracked yet — add the terms {clientName} should rank for.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high border-b border-outline">
                <tr>
                  {['Keyword', 'Target URL', 'Added', ''].map((h) => (
                    <th key={h} className="p-5 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {keywords.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-variant/30 transition-colors">
                    <td className="p-5">
                      <span className="px-2 py-1 bg-surface-container border border-outline rounded-md text-sm font-label-mono text-primary">
                        {k.keyword}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-on-surface-variant">{k.target_url || '—'}</td>
                    <td className="p-5 text-sm text-on-surface-variant font-label-mono">
                      {(k.created_at || '').slice(0, 10)}
                    </td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => removeKeyword(k.id)}
                        className="text-on-surface-variant hover:text-error transition-colors"
                        aria-label={`Remove ${k.keyword}`}
                      >
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

      <div className="lg:col-span-4 space-y-gutter">
        <div className="bento-card p-6 rounded-xl">
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
            Keywords tracked
          </p>
          <h3 className="font-headline-lg text-4xl mt-2 text-primary">{keywords.length}</h3>
        </div>

        <form onSubmit={addKeyword} className="bento-card p-6 rounded-xl space-y-4">
          <h3 className="font-headline-lg text-xl">Add Keyword</h3>
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Keyword</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. dental implants utah"
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Target URL (optional)</span>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/services/implants"
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !keyword.trim()}
            className="w-full py-3 gold-gradient text-black font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Track Keyword'}
          </button>
        </form>
      </div>
    </section>
  )
}

// --- link picker (admin) ----------------------------------------------------

function LinkPicker({ activeClient, onLinked }) {
  const { data, loading, error } = useResource(fetchCaClients, [])
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Pre-select a confident name/website match once clients load.
  useEffect(() => {
    if (data?.clients && !selected) {
      setSelected(suggestCaClientId(activeClient, data.clients))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  async function save() {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    try {
      await setContentAgentLink(activeClient, selected)
      await onLinked()
    } catch (e) {
      setSaveError(e.message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bento-card rounded-xl p-6 max-w-xl">
      <CaBoundary loading={loading} error={error}>
        {data && (
          <div className="space-y-4">
            <div>
              <h3 className="font-headline-lg text-xl">Link {activeClient.name} to Content Agent</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Pick the matching workspace in the Content Agent. The active client switcher above
                drives which workspace this page shows.
              </p>
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Select a Content Agent client…</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.website ? ` — ${c.website}` : ''}
                </option>
              ))}
            </select>
            {saveError && <p className="text-sm text-error">{saveError}</p>}
            <button
              onClick={save}
              disabled={!selected || saving}
              className="gold-gradient text-black font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Linking…' : 'Link workspace'}
            </button>
          </div>
        )}
      </CaBoundary>
    </div>
  )
}

// --- page -------------------------------------------------------------------

export default function SeoGeo() {
  const { openNav } = useOutletContext()
  const { activeClient, reload } = useClient()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')

  // Data is keyed by the Mammoth slug in our own DB; the link to a Content Agent
  // workspace only governs whether data has been imported for this client.
  const linkedCaId = activeClient?.contentAgentClientId || ''
  const slug = activeClient?.id || ''

  return (
    <>
      <TopBar title="SEO / GEO Strategy" searchPlaceholder="Search SEO/GEO…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">
        {/* Header / link status */}
        <div className="bento-card rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center shrink-0">
              <Icon name="travel_explore" filled className="text-black" />
            </div>
            <div>
              <h3 className="font-headline-lg text-xl text-primary">Content Agent</h3>
              <p className="text-sm text-on-surface-variant max-w-md">
                The SEO/GEO research &amp; content workspace for{' '}
                <span className="text-on-surface">{activeClient?.name}</span>, live in Mission Control.
              </p>
            </div>
          </div>
          <a
            href={CONTENT_AGENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 border border-outline hover:border-primary text-on-surface-variant hover:text-primary px-4 py-2.5 rounded-full transition-colors text-sm"
          >
            <Icon name="open_in_new" className="text-base" />
            Open full app
          </a>
        </div>

        {/* Not linked → admins link it; clients are told to ask an admin. */}
        {!linkedCaId ? (
          isAdmin ? (
            <LinkPicker activeClient={activeClient} onLinked={reload} />
          ) : (
            <StateNote icon="link_off" title="Not linked yet">
              This client isn’t linked to a Content Agent workspace. Ask an admin to link it.
            </StateNote>
          )
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto custom-scrollbar border-b border-outline">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon name={t.icon} filled={tab === t.key} className="text-base" />
                  {t.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => setContentAgentLink(activeClient, null).then(reload)}
                  className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs text-on-surface-variant hover:text-error transition-colors"
                  title="Unlink this client from Content Agent"
                >
                  <Icon name="link_off" className="text-sm" />
                  Unlink
                </button>
              )}
            </div>

            {/* Active tab — keyed by client so data reloads on client switch */}
            <div key={slug}>
              {tab === 'dashboard' && <DashboardTab clientId={slug} />}
              {tab === 'drafts' && <DraftsTab clientId={slug} />}
              {tab === 'keywords' && <KeywordsTab clientId={slug} />}
              {tab === 'reports' && <ReportsTab clientId={slug} />}
              {tab === 'analysis' && <AnalysisTab clientId={slug} />}
              {tab === 'watchlist' && (
                <WatchlistTab clientId={activeClient.id} clientName={activeClient.name} />
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

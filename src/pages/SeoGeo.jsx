import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { useClient } from '../context/ClientContext'
import { fetchKeywords, createKeyword, deleteKeyword } from '../lib/seoKeywords'

// The dedicated SEO/GEO web app this page previews and links out to.
const CONTENT_AGENT_URL = 'https://content-agent.disruptorsmedia.com/'

export default function SeoGeo() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()

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
      setKeywords(await fetchKeywords(activeClient.id))
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [activeClient.id])

  useEffect(() => {
    load()
  }, [load])

  async function addKeyword(e) {
    e.preventDefault()
    if (!keyword.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createKeyword(activeClient.id, {
        keyword: keyword.trim(),
        target_url: targetUrl.trim(),
      })
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
    <>
      <TopBar title="SEO / GEO Strategy" searchPlaceholder="Search keywords…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">

        {/* Content Agent launcher — the full SEO/GEO tooling lives in a separate web app.
            We show an obvious live preview of it that opens the real app in a new tab. */}
        <div className="bento-card rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center shrink-0">
                <Icon name="travel_explore" filled className="text-black" />
              </div>
              <div>
                <h3 className="font-headline-lg text-xl text-primary">Content Agent</h3>
                <p className="text-sm text-on-surface-variant max-w-md">
                  The full SEO/GEO research and content workspace runs as a dedicated app. Track
                  your target keywords below — open the agent for the deep tooling.
                </p>
              </div>
            </div>
            <a
              href={CONTENT_AGENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 gold-gradient text-black font-bold px-5 py-3 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-gold"
            >
              <Icon name="open_in_new" className="text-lg" />
              <span>Open Content Agent</span>
            </a>
          </div>

          {/* Live website preview — looks like a browser window, opens the real app on click. */}
          <a
            href={CONTENT_AGENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl overflow-hidden border border-outline hover:border-primary transition-colors"
          >
            {/* Fake browser chrome / address bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-high border-b border-outline">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-error/70" />
                <span className="w-3 h-3 rounded-full bg-primary/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-background border border-outline rounded-md px-3 py-1 max-w-md">
                <Icon name="lock" className="text-on-surface-variant text-xs" />
                <span className="font-label-mono text-xs text-on-surface-variant truncate">
                  content-agent.disruptorsmedia.com
                </span>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-label-mono uppercase tracking-widest text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>

            {/* The live site (non-interactive thumbnail) + hover overlay to open it */}
            <div className="relative h-72 md:h-96 bg-background overflow-hidden">
              <iframe
                src={CONTENT_AGENT_URL}
                title="Content Agent live preview"
                loading="lazy"
                tabIndex={-1}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="gold-gradient text-black font-bold px-6 py-3 rounded-full flex items-center gap-2 glow-gold">
                  <Icon name="open_in_new" className="text-lg" />
                  Open Content Agent
                </span>
              </div>
            </div>
          </a>
        </div>

        {/* Keyword watchlist — real per-client data */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="bento-card lg:col-span-8 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-outline flex justify-between items-center gap-4">
              <div>
                <h3 className="font-headline-lg text-xl">Keyword Watchlist</h3>
                <p className="text-sm text-on-surface-variant">
                  Target keywords for {activeClient.name} — rank tracking connects later.
                </p>
              </div>
              {loading && <Icon name="progress_activity" className="animate-spin text-primary" />}
            </div>

            {error && (
              <p className="px-6 py-3 text-sm text-error border-b border-outline">{error}</p>
            )}

            {keywords.length === 0 && !loading ? (
              <p className="text-sm text-on-surface-variant py-10 text-center px-6">
                No keywords tracked yet — add the terms {activeClient.name} should rank for.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-high border-b border-outline">
                    <tr>
                      {['Keyword', 'Target URL', 'Added', ''].map((h) => (
                        <th
                          key={h}
                          className="p-5 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant"
                        >
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
                        <td className="p-5 text-sm text-on-surface-variant">
                          {k.target_url || '—'}
                        </td>
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

          {/* Add keyword + count */}
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
      </div>
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Fab from '../components/Fab'
import Icon from '../components/Icon'
import { useClient } from '../context/ClientContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchTasks, BOARD_COLUMNS } from '../lib/tasks'
import { fetchContentPosts } from '../lib/contentBoard'
import { fetchRecentActivity, relTime } from '../lib/activity'
import { getClientSocialSnapshot, postsPerDay } from '../lib/socialStats'

const COLUMN_TITLES = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.key, c.title]))

const QUEUE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To-Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
]

export default function Overview() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState([])
  const [contentPosts, setContentPosts] = useState([])
  const [activity, setActivity] = useState([])
  const [social, setSocial] = useState(null) // snapshot | null while loading
  const [socialError, setSocialError] = useState(false)
  const [chartRange, setChartRange] = useState(7)
  const [queueFilter, setQueueFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const clientId = activeClient.id
    const [t, c, a] = await Promise.all([
      fetchTasks(clientId).catch(() => []),
      fetchContentPosts(clientId).catch(() => []),
      fetchRecentActivity(clientId, 6).catch(() => []),
    ])
    setTasks(t)
    setContentPosts(c)
    setActivity(a)
    setLoading(false)
    // Vista loads independently so a missing key doesn't block the dashboard.
    setSocial(null)
    setSocialError(false)
    getClientSocialSnapshot(activeClient)
      .then(setSocial)
      .catch(() => {
        setSocial({ linked: false, posts: [], stats: null })
        setSocialError(true)
      })
  }, [activeClient])

  useEffect(() => {
    load()
  }, [load])

  // ---- Derived metrics -------------------------------------------------------
  const openTasks = tasks.filter((t) => t.column_key !== 'review').length
  const inReviewTasks = tasks.filter((t) => t.column_key === 'review').length
  const publishedContent = contentPosts.filter((p) => p.column_key === 'published').length

  const weekDelta = social?.stats
    ? social.stats.postsThisWeek - social.stats.postsPrevWeek
    : null

  const metrics = [
    {
      icon: 'assignment',
      label: 'Open Tasks',
      value: String(openTasks),
      sub: `${inReviewTasks} in review`,
      to: '/task-management',
    },
    {
      icon: 'share',
      label: 'Content Pipeline',
      value: String(contentPosts.length),
      sub: `${publishedContent} published`,
      to: '/social-media',
    },
    {
      icon: 'insights',
      label: 'Posts This Week',
      value: social?.stats ? String(social.stats.postsThisWeek) : '—',
      sub: social?.stats
        ? `${weekDelta >= 0 ? '+' : ''}${weekDelta} vs last week`
        : socialError
          ? 'Social offline'
          : social && !social.linked
            ? 'Not linked to Vista'
            : 'Loading…',
      to: '/social-media',
    },
  ]

  const chartSeries = useMemo(
    () => (social?.posts ? postsPerDay(social.posts, chartRange) : []),
    [social, chartRange],
  )
  const chartMax = Math.max(1, ...chartSeries.map((d) => d.count))
  const chartHasData = chartSeries.some((d) => d.count > 0)

  const queueTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) =>
      (b.updated_at || '').localeCompare(a.updated_at || ''),
    )
    return (queueFilter === 'all' ? sorted : sorted.filter((t) => t.column_key === queueFilter)).slice(0, 8)
  }, [tasks, queueFilter])

  return (
    <>
      <TopBar title="Disruptors Media" onMenu={openNav} />
      <div className="p-6 md:p-8 max-w-container-max mx-auto w-full space-y-12">
        {/* Hero */}
        <section className="flex flex-col gap-2">
          <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl leading-tight">
            <span className="gold-gradient-text">Your AI growth engine —</span>
            <br />
            <span className="text-white opacity-90">content, ads, SEO, CRM.</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="px-4 py-1.5 bg-surface-container border border-outline rounded-xl flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-primary animate-pulse' : 'bg-error'}`}
              />
              <span className="mono-data text-xs font-label-mono text-on-surface-variant uppercase">
                {isSupabaseConfigured ? 'Engine Online' : 'Offline — configure Supabase'}
              </span>
            </div>
            <span className="text-on-surface-variant font-body-md opacity-60">
              Active client: <span className="text-primary">{activeClient.name}</span>
            </span>
          </div>
        </section>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Metrics */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            {metrics.map((m) => (
              <button
                key={m.label}
                onClick={() => navigate(m.to)}
                className="text-left bg-surface-container border border-outline rounded-xl p-6 flex flex-col justify-between hover:border-primary transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <Icon
                    name={m.icon}
                    className="text-primary group-hover:scale-110 transition-transform"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-on-surface-variant text-xs uppercase font-label-mono tracking-wider">
                    {m.label}
                  </p>
                  <p className="text-headline-lg font-bold mono-data">{loading ? '…' : m.value}</p>
                  <p className="text-primary text-xs mono-data mt-1">{m.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Plan CTA */}
          <button
            onClick={() => navigate('/subscription')}
            className="text-left w-full md:col-span-4 bg-primary-container p-8 rounded-xl flex items-center justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-on-primary font-bold text-headline-lg">Manage Plan</p>
              <p className="text-on-primary-container text-sm opacity-80">
                {activeClient.plan
                  ? `Current: ${activeClient.plan[0].toUpperCase()}${activeClient.plan.slice(1)}`
                  : 'No plan selected yet'}
              </p>
            </div>
            <Icon
              name="arrow_forward"
              className="text-4xl text-on-primary group-hover:translate-x-2 transition-transform relative z-10"
            />
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500" />
          </button>

          {/* Publishing activity chart */}
          <div className="md:col-span-8 bg-surface-container border border-outline rounded-xl p-8 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-headline-lg text-headline-lg font-bold">Publishing Activity</h3>
                <p className="text-on-surface-variant text-sm font-body-md opacity-60">
                  Social posts per day{social?.group ? ` — ${social.group.name}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {[7, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setChartRange(d)}
                    className={`px-4 py-1 text-xs font-label-mono rounded-full border transition-colors ${
                      chartRange === d
                        ? 'border-primary text-primary'
                        : 'border-outline text-on-surface-variant hover:border-primary'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[260px] flex items-end justify-center gap-2 px-4 pt-8 pb-2 border-b border-l border-outline/30 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 py-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full border-t border-on-surface" />
                ))}
              </div>
              {!social && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant">
                  Loading social activity…
                </p>
              )}
              {social && !chartHasData && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant text-center px-8">
                  {socialError
                    ? 'Social data unavailable — check the Vista Social connection.'
                    : social.linked
                      ? 'No posts in this window yet.'
                      : `No Vista Social group matches “${activeClient.name}” — link it in Vista or set the group id on the client.`}
                </p>
              )}
              {chartHasData &&
                chartSeries.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.count} post${d.count === 1 ? '' : 's'} · ${d.day}`}
                    className="group flex h-full max-w-[2.75rem] flex-1 flex-col items-center justify-end"
                  >
                    {(chartSeries.length <= 14 || d.count > 0) && (
                      <span className="mb-1 mono-data text-[10px] font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                        {d.count}
                      </span>
                    )}
                    <div
                      className="w-full bg-primary/20 group-hover:bg-primary transition-colors rounded-t-lg"
                      style={{ height: `${Math.max(4, (d.count / chartMax) * 100)}%` }}
                    />
                  </div>
                ))}
            </div>
            {/* x-axis day labels */}
            {chartHasData && (
              <div className="flex justify-center gap-2 px-4 -mt-4">
                {chartSeries.map((d, i) => {
                  const step = Math.ceil(chartSeries.length / 8)
                  const show = chartSeries.length <= 14 || i % step === 0
                  return (
                    <span key={d.day} className="max-w-[2.75rem] flex-1 text-center mono-data text-[9px] text-on-surface-variant truncate">
                      {show ? d.day.slice(5) : ''}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="md:col-span-4 bg-surface-container border border-outline rounded-xl p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline-lg text-headline-lg font-bold">Activity Feed</h3>
              <button onClick={load} aria-label="Refresh activity">
                <Icon
                  name="refresh"
                  className={`text-on-surface-variant cursor-pointer hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {activity.length === 0 && !loading && (
                <p className="text-sm text-on-surface-variant">
                  No activity yet — add a task or a content post to get started.
                </p>
              )}
              {activity.map((a) => (
                <div key={a.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-background z-10" />
                    <div className="w-px h-full bg-outline group-last:bg-transparent" />
                  </div>
                  <div className="pb-6 min-w-0">
                    <p className="text-sm font-body-md truncate">
                      <span className="font-bold text-primary">{a.sub}</span>{' '}
                      <span className="text-white opacity-80">{a.label}</span>
                    </p>
                    <p className="text-[10px] mono-data text-on-surface-variant mt-1 uppercase">
                      {COLUMN_TITLES[a.detail] || a.detail} — {relTime(a.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task queue */}
          <div className="md:col-span-12 bg-surface-container border border-outline rounded-xl p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="font-headline-lg text-headline-lg font-bold">The Task Queue</h3>
                <p className="text-on-surface-variant text-sm font-body-md opacity-60">
                  Latest tasks for {activeClient.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/task-management')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-black transition-colors"
                >
                  <Icon name="view_kanban" className="text-sm" /> View Board
                </button>
                <div className="flex bg-surface-container-low border border-outline p-1 rounded-lg">
                  {QUEUE_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setQueueFilter(f.key)}
                      className={`px-3 py-1 text-xs font-label-mono rounded-md transition-colors ${
                        queueFilter === f.key ? 'bg-surface-variant text-primary' : 'hover:text-primary'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {queueTasks.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-6 text-center">
                  No tasks{queueFilter !== 'all' ? ' in this column' : ''} yet —{' '}
                  <button
                    onClick={() => navigate('/task-management')}
                    className="text-primary font-bold hover:underline"
                  >
                    open the board
                  </button>{' '}
                  to add one.
                </p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b border-outline">
                      {['Task', 'Assignee', 'Tag', 'Status', 'Progress'].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-4 font-label-mono text-xs text-on-surface-variant uppercase tracking-widest px-4 ${i === 4 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/30">
                    {queueTasks.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => navigate('/task-management')}
                        className="group hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        <td className="py-5 px-4 font-medium">{t.title}</td>
                        <td className="py-5 px-4 text-sm text-on-surface-variant">
                          {t.assignee || '—'}
                        </td>
                        <td className="py-5 px-4">
                          {t.tag ? (
                            <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold border bg-primary/10 text-primary border-primary">
                              {t.tag}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant text-sm">—</span>
                          )}
                        </td>
                        <td className="py-5 px-4 text-sm font-label-mono text-on-surface-variant">
                          {COLUMN_TITLES[t.column_key] || t.column_key}
                        </td>
                        <td className="py-5 px-4 text-right">
                          {typeof t.progress === 'number' ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-1 bg-outline rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${t.progress}%` }}
                                />
                              </div>
                              <span className="mono-data text-xs">{t.progress}%</span>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      <Fab icon="bolt" title="Open task board" onClick={() => navigate('/task-management')} />
    </>
  )
}

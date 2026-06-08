import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Fab from '../components/Fab'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { useClient } from '../context/ClientContext'

const METRICS = [
  { icon: 'insights', label: 'Social Reach', value: '2.4M', delta: '+12.4%', to: '/social-media' },
  { icon: 'track_changes', label: 'Conversion', value: '4.12%', delta: '+0.8%', to: '/seo-geo' },
  { icon: 'monetization_on', label: 'ROAS', value: '6.4x', delta: '-2.1%', to: '/paid-advertising' },
]

const CHART_DATA = {
  '7D': {
    bars: ['40%', '65%', '85%', '50%', '70%', '95%', '60%'],
    values: ['$12k', '$18k', '$24k', '$15k', '$19k', '$28k', '$17k'],
  },
  '30D': {
    bars: ['55%', '45%', '70%', '80%', '60%', '90%', '100%'],
    values: ['$48k', '$41k', '$62k', '$71k', '$58k', '$83k', '$96k'],
  },
}

const ACTIVITY = [
  {
    tone: 'primary',
    body: (
      <>
        <span className="font-bold text-primary">Content Bot</span> generated 42 LinkedIn posts for{' '}
        <span className="text-white opacity-80">Q4 Launch</span>
      </>
    ),
    meta: '14:22 — COMPLETED',
  },
  {
    tone: 'outline',
    body: (
      <>
        <span className="font-bold text-primary">Sarah Miller</span> approved the{' '}
        <span className="text-white opacity-80">Instagram Aesthetic Overhaul</span>
      </>
    ),
    meta: '11:05 — APPROVED',
  },
  {
    tone: 'error',
    body: (
      <>
        <span className="font-bold text-error">System Alert:</span> API limit reached for{' '}
        <span className="text-white opacity-80">Meta Advertising Graph</span>
      </>
    ),
    meta: '09:12 — CRITICAL',
  },
  {
    tone: 'primary',
    body: (
      <>
        <span className="font-bold text-primary">Mission Control</span> optimized campaign bid
        strategy for <span className="text-white opacity-80">Max ROAS</span>
      </>
    ),
    meta: '08:45 — OPTIMIZED',
  },
]

const TASKS = [
  {
    id: '#TR-8821',
    name: 'B2B Content Pillar Synthesis',
    agent: { initial: 'C', name: 'CopyBot Elite', bg: 'bg-primary-container' },
    priority: 'High',
    progress: 75,
  },
  {
    id: '#VG-4022',
    name: 'Video Ad Scripting (30s)',
    agent: { initial: 'V', name: 'Vision Engine', bg: 'bg-tertiary-container' },
    priority: 'Med',
    status: 'Scheduled',
  },
  {
    id: '#TR-8823',
    name: 'Newsletter Automation Hook',
    agent: { initial: 'C', name: 'CopyBot Elite', bg: 'bg-primary-container' },
    priority: 'High',
    running: true,
  },
]

function dotClass(tone) {
  if (tone === 'error') return 'border-error'
  if (tone === 'outline') return 'border-outline'
  return 'border-primary'
}

export default function Overview() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const navigate = useNavigate()
  const { show, node: toast } = useToast()
  const [chartRange, setChartRange] = useState('7D')
  const [taskFilter, setTaskFilter] = useState('All')

  const { bars: chartBars, values: chartValues } = CHART_DATA[chartRange]
  const visibleTasks = TASKS.filter((t) =>
    taskFilter === 'All'
      ? true
      : taskFilter === 'Running'
        ? t.running
        : !t.running, // Pending
  )

  return (
    <>
      <TopBar title="Disruptors Media" onMenu={openNav} />
      <div className="p-6 md:p-8 max-w-container-max mx-auto w-full space-y-12">
        {/* Hero */}
        <section className="flex flex-col gap-2">
          <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl leading-tight">
            <span className="gold-gradient-text">Your AI content engine,</span>
            <br />
            <span className="text-white opacity-90">end-to-end.</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="px-4 py-1.5 bg-surface-container border border-outline rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="mono-data text-xs font-label-mono text-on-surface-variant uppercase">
                Engine Online
              </span>
            </div>
            <span className="text-on-surface-variant font-body-md opacity-60">
              Active client: <span className="text-primary">{activeClient.name}</span> — v2.4.0
            </span>
          </div>
        </section>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Metrics */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            {METRICS.map((m) => (
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
                  <span className="text-primary text-xs mono-data">{m.delta}</span>
                </div>
                <div className="mt-4">
                  <p className="text-on-surface-variant text-xs uppercase font-label-mono tracking-wider">
                    {m.label}
                  </p>
                  <p className="text-headline-lg font-bold mono-data">{m.value}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Upgrade CTA */}
          <button
            onClick={() => navigate('/subscription')}
            className="text-left w-full md:col-span-4 bg-primary-container p-8 rounded-xl flex items-center justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-on-primary font-bold text-headline-lg">Upgrade Tier</p>
              <p className="text-on-primary-container text-sm opacity-80">
                Unlock Opus 4.8 Turbo Engine
              </p>
            </div>
            <Icon
              name="arrow_forward"
              className="text-4xl text-on-primary group-hover:translate-x-2 transition-transform relative z-10"
            />
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500" />
          </button>

          {/* Advertising performance chart */}
          <div className="md:col-span-8 bg-surface-container border border-outline rounded-xl p-8 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-headline-lg text-headline-lg font-bold">
                  Advertising Performance
                </h3>
                <p className="text-on-surface-variant text-sm font-body-md opacity-60">
                  Cross-platform campaign efficacy tracking
                </p>
              </div>
              <div className="flex gap-2">
                {['7D', '30D'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-4 py-1 text-xs font-label-mono rounded-full border transition-colors ${
                      chartRange === r
                        ? 'border-primary text-primary'
                        : 'border-outline text-on-surface-variant hover:border-primary'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[260px] flex items-end gap-3 px-4 py-6 border-b border-l border-outline/30 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 py-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full border-t border-white" />
                ))}
              </div>
              {chartBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 hover:bg-primary transition-colors rounded-t-lg group relative"
                  style={{ height: h }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity mono-data text-xs text-primary font-bold">
                    {chartValues[i]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="md:col-span-4 bg-surface-container border border-outline rounded-xl p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline-lg text-headline-lg font-bold">Activity Feed</h3>
              <button onClick={() => show('Activity feed refreshed.', 'refresh')} aria-label="Refresh activity">
                <Icon name="refresh" className="text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
              </button>
            </div>
            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${dotClass(a.tone)} bg-background z-10`}
                    />
                    <div className="w-px h-full bg-outline group-last:bg-transparent" />
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-body-md">{a.body}</p>
                    <p className="text-[10px] mono-data text-on-surface-variant mt-1">{a.meta}</p>
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
                  Pending and active content generation workflows
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/task-management')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-black transition-colors"
                >
                  <Icon name="view_kanban" className="text-sm" /> View Board
                </button>
                <span className="text-xs font-label-mono text-on-surface-variant uppercase">
                  Filter by Status:
                </span>
                <div className="flex bg-surface-container-low border border-outline p-1 rounded-lg">
                  {['All', 'Pending', 'Running'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-3 py-1 text-xs font-label-mono rounded-md transition-colors ${
                        taskFilter === f
                          ? 'bg-surface-variant text-primary'
                          : 'hover:text-primary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-outline">
                    {['Workload ID', 'Task Name', 'Assigned Agent', 'Priority', 'Status'].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`pb-4 font-label-mono text-xs text-on-surface-variant uppercase tracking-widest px-4 ${
                            i === 3 ? 'text-center' : ''
                          } ${i === 4 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/30">
                  {visibleTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => navigate('/task-management')}
                      className="group hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      <td className="py-5 px-4 mono-data text-sm opacity-60">{t.id}</td>
                      <td className="py-5 px-4 font-medium">{t.name}</td>
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded ${t.agent.bg} text-[10px] flex items-center justify-center font-bold`}
                          >
                            {t.agent.initial}
                          </div>
                          <span className="text-sm">{t.agent.name}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                            t.priority === 'High'
                              ? 'bg-primary/10 text-primary border-primary'
                              : 'bg-surface-variant text-on-surface-variant border-outline'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-right">
                        {t.running ? (
                          <div className="flex items-center justify-end gap-2 text-primary">
                            <Icon name="sync" className="text-sm animate-spin" />
                            <span className="mono-data text-xs">Running</span>
                          </div>
                        ) : t.status ? (
                          <span className="text-sm font-label-mono text-on-surface-variant">
                            {t.status}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 bg-outline rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                            <span className="mono-data text-xs">{t.progress}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Fab icon="bolt" title="Launch Quick Action" onClick={() => navigate('/task-management')} />
      {toast}
    </>
  )
}

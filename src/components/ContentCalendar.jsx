import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Icon from './Icon'
import { listPosts, getGroupedProfiles, networkStyle, statusStyle } from '../lib/vistaSocial'

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const VIEWS = [
  { key: 'month', label: 'Monthly' },
  { key: 'week', label: 'Weekly' },
  { key: 'day', label: 'Daily' },
]

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfWeek = (d) => {
  const lead = (d.getDay() + 6) % 7 // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - lead)
}

// Status filter buckets (and legend) — mirrors how Vista's calendar groups posts.
const FILTERS = [
  { key: 'ALL', label: 'All', dot: 'bg-on-surface/60' },
  { key: 'scheduled', label: 'Scheduled', dot: 'bg-primary' },
  { key: 'published', label: 'Published', dot: 'bg-green-500' },
  { key: 'review', label: 'In review', dot: 'bg-blue-400' },
  { key: 'draft', label: 'Drafts', dot: 'bg-on-surface-variant' },
]

function bucketOf(status) {
  switch (String(status || '').toUpperCase()) {
    case 'SCHEDULED':
    case 'APPROVED':
      return 'scheduled'
    case 'PUBLISHED':
      return 'published'
    case 'IN_REVIEW':
    case 'REVIEW':
      return 'review'
    case 'DRAFT':
      return 'draft'
    default:
      return 'other' // PROCESSING / FAILED / REJECTED — only shown under "All"
  }
}

// 6-week (42-cell) Monday-first grid covering viewDate's month. Also used as the
// post-fetch window since it always contains the current week/day too.
function buildMonthGrid(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { date: d, key: ymd(d), inMonth: d.getMonth() === viewDate.getMonth() }
  })
}

function buildWeek(viewDate) {
  const s = startOfWeek(viewDate)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)
    return { date: d, key: ymd(d), inMonth: d.getMonth() === viewDate.getMonth() }
  })
}

// Tri-state checkbox visual: 'on' | 'off' | 'mixed'.
function CheckBox({ state }) {
  return (
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        state === 'off' ? 'border-outline' : 'border-primary bg-primary text-on-primary-container'
      }`}
    >
      {state === 'on' && <Icon name="check" className="text-[13px] leading-none" />}
      {state === 'mixed' && <Icon name="remove" className="text-[13px] leading-none" />}
    </span>
  )
}

export default function ContentCalendar() {
  const [view, setView] = useState('month')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [posts, setPosts] = useState([])
  const [state, setState] = useState('idle') // posts: idle | loading | ready | error
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Client tree + selection
  const [groups, setGroups] = useState([])
  const [groupsState, setGroupsState] = useState('loading') // loading | ready | error
  const [selected, setSelected] = useState(() => new Set())
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())
  const selectorRef = useRef(null)
  const viewMenuRef = useRef(null)

  const monthGrid = useMemo(() => buildMonthGrid(viewDate), [viewDate])
  const weekCells = useMemo(() => buildWeek(viewDate), [viewDate])
  const todayKey = ymd(new Date())
  const dayKey = ymd(viewDate)

  // Flatten the tree for lookups.
  const allProfiles = useMemo(() => groups.flatMap((g) => g.profiles), [groups])
  const allIds = useMemo(() => allProfiles.map((p) => p.id), [allProfiles])
  const profileNames = useMemo(() => new Map(allProfiles.map((p) => [p.id, p.name])), [allProfiles])

  // Load the client tree once, default everything selected.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setGroupsState('loading')
      try {
        const tree = await getGroupedProfiles()
        if (cancelled) return
        setGroups(tree)
        setSelected(new Set(tree.flatMap((g) => g.profiles.map((p) => p.id))))
        setGroupsState('ready')
      } catch {
        if (!cancelled) setGroupsState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch posts for ALL profiles over viewDate's month window (covers any view).
  // Selection + view filter client-side, so toggling is instant.
  const rangeStartKey = monthGrid[0].key
  const rangeEndKey = monthGrid[monthGrid.length - 1].key
  const loadPosts = useCallback(async () => {
    if (!allIds.length) return
    setState('loading')
    setError('')
    try {
      const rows = await listPosts({ profileIds: allIds, dateFrom: rangeStartKey, dateTo: rangeEndKey })
      setPosts(rows)
      setState('ready')
    } catch (err) {
      setError(err.message || 'Failed to load posts.')
      setState('error')
    }
  }, [allIds, rangeStartKey, rangeEndKey])

  useEffect(() => {
    if (groupsState === 'ready' && allIds.length) loadPosts()
  }, [groupsState, loadPosts, allIds.length])

  // Close popovers on outside click.
  useEffect(() => {
    if (!selectorOpen && !viewMenuOpen) return
    const onClick = (e) => {
      if (selectorOpen && selectorRef.current && !selectorRef.current.contains(e.target)) setSelectorOpen(false)
      if (viewMenuOpen && viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setViewMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [selectorOpen, viewMenuOpen])

  // Apply selection + status filter, then bucket by day.
  const byDay = useMemo(() => {
    const m = new Map()
    for (const p of posts) {
      if (!p.day || !selected.has(p.profileId)) continue
      if (statusFilter !== 'ALL' && bucketOf(p.status) !== statusFilter) continue
      if (!m.has(p.day)) m.set(p.day, [])
      m.get(p.day).push(p)
    }
    return m
  }, [posts, selected, statusFilter])

  const truncated = useMemo(() => {
    if (view !== 'month' || posts.length < 500) return false
    const maxDay = posts.reduce((mx, p) => (p.day > mx ? p.day : mx), '')
    return maxDay && maxDay < rangeEndKey
  }, [posts, rangeEndKey, view])

  // Navigation + label depend on the active view.
  const shift = (delta) =>
    setViewDate((d) => {
      if (view === 'month') return new Date(d.getFullYear(), d.getMonth() + delta, 1)
      const nd = new Date(d)
      nd.setDate(d.getDate() + delta * (view === 'week' ? 7 : 1))
      return nd
    })
  const goToday = () => setViewDate(new Date())

  const navLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
    if (view === 'day')
      return viewDate.toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    const ws = weekCells[0].date
    const we = weekCells[6].date
    const opts = { month: 'short', day: 'numeric' }
    return `${ws.toLocaleDateString(undefined, opts)} – ${we.toLocaleDateString(undefined, opts)}, ${we.getFullYear()}`
  }, [view, viewDate, weekCells])

  // Selection helpers
  const groupState = (g) => {
    const n = g.profiles.filter((p) => selected.has(p.id)).length
    return n === 0 ? 'off' : n === g.profiles.length ? 'on' : 'mixed'
  }
  const toggleGroup = (g) =>
    setSelected((prev) => {
      const next = new Set(prev)
      const ids = g.profiles.map((p) => p.id)
      const allOn = ids.every((id) => next.has(id))
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)))
      return next
    })
  const toggleProfile = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectedCount = selected.size
  const allSelected = selectedCount === allIds.length && allIds.length > 0
  const selectorLabel =
    groupsState !== 'ready'
      ? 'Loading clients…'
      : allSelected
      ? `All clients · ${allIds.length}`
      : `${selectedCount} profile${selectedCount === 1 ? '' : 's'}`

  const selectedPosts = selectedDay ? byDay.get(selectedDay) || [] : []
  const dayPosts = (byDay.get(dayKey) || [])
    .slice()
    .sort((a, b) => (a.publishAt || '').localeCompare(b.publishAt || ''))

  // Shared post-row markup (used by week/day/modal cards).
  const PostCard = ({ p }) => {
    const ns = networkStyle(p.network)
    const ss = statusStyle(p.status)
    return (
      <a
        href={p.internalLink || p.publishedLink || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3 rounded-lg border border-outline/50 bg-surface-container-low hover:border-primary transition-colors group"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-6 h-6 rounded ${ns.bg} flex items-center justify-center text-white shrink-0`}>
            {ns.short ? <span className="text-[10px] font-bold">{ns.short}</span> : <Icon name={ns.icon} className="text-[13px]" />}
          </div>
          <span className="text-xs font-bold text-on-surface truncate flex-1">{profileNames.get(p.profileId) || ns.label}</span>
          <span className={`text-[10px] font-label-mono uppercase ${ss.text}`}>{ss.label}</span>
        </div>
        <p className="text-xs text-on-surface-variant line-clamp-3">{p.message}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-label-mono text-on-surface-variant">{p.publishAtFormatted}</span>
          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            Open in Vista <Icon name="open_in_new" className="text-[11px]" />
          </span>
        </div>
      </a>
    )
  }

  // Compact chip used inside month/week cells.
  const PostChip = ({ p }) => {
    const ns = networkStyle(p.network)
    const ss = statusStyle(p.status)
    return (
      <div
        title={`${ss.label} · ${p.message || ''}`}
        className="flex items-center gap-1 rounded bg-surface-container-low border border-outline/40 px-1 py-0.5"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ss.dot}`} />
        <Icon name={ns.icon} className="text-[11px] text-on-surface-variant shrink-0" />
        <span className="text-[9px] text-on-surface/70 truncate leading-tight">{p.message || ns.label}</span>
      </div>
    )
  }

  const GridCell = ({ cell, tall }) => {
    const list = byDay.get(cell.key) || []
    const isToday = cell.key === todayKey
    const cap = tall ? 12 : 3
    return (
      <div
        onClick={() => list.length && setSelectedDay(cell.key)}
        className={[
          tall ? 'min-h-[420px]' : 'min-h-[92px]',
          'rounded-lg p-1.5 border flex flex-col gap-1 transition-colors overflow-hidden',
          cell.inMonth ? 'bg-surface-variant/10' : 'bg-surface-variant/[0.03] opacity-50',
          isToday ? 'border-primary' : 'border-outline/30',
          list.length ? 'cursor-pointer hover:border-primary' : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-0.5">
          <span className={`text-xs ${isToday ? 'font-bold text-primary' : cell.inMonth ? 'text-on-surface/80' : 'text-on-surface-variant'}`}>
            {cell.date.getDate()}
          </span>
          {list.length > 0 && (
            <span className="text-[9px] font-label-mono text-primary bg-primary/10 rounded px-1">{list.length}</span>
          )}
        </div>
        <div className={`flex flex-col gap-1 ${tall ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
          {list.slice(0, cap).map((p) => <PostChip key={p.id} p={p} />)}
          {list.length > cap && <span className="text-[9px] font-label-mono text-primary px-1">+{list.length - cap} more</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-12 lg:col-span-7 bg-surface-container border border-outline rounded-xl p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Content Calendar</h3>
          {state === 'loading' && <Icon name="progress_activity" className="animate-spin text-primary text-base" />}
        </div>
        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setViewMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-outline text-sm text-on-surface hover:border-primary transition-colors"
            >
              {VIEWS.find((v) => v.key === view).label}
              <Icon name={viewMenuOpen ? 'expand_less' : 'expand_more'} className="text-base text-on-surface-variant" />
            </button>
            {viewMenuOpen && (
              <div className="absolute z-40 right-0 mt-1 w-32 bg-surface-container border border-outline rounded-lg shadow-2xl overflow-hidden">
                {VIEWS.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => {
                      setView(v.key)
                      setViewMenuOpen(false)
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                      view === v.key ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface hover:bg-surface-variant/20'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={goToday}
            className="text-[10px] font-label-mono uppercase tracking-widest px-3 py-1 rounded-full border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          >
            Today
          </button>
          <span className="text-sm font-label-mono text-on-surface-variant uppercase tabular-nums">{navLabel}</span>
          <div className="flex gap-1">
            <Icon name="chevron_left" onClick={() => shift(-1)} className="p-1 cursor-pointer hover:text-primary" />
            <Icon name="chevron_right" onClick={() => shift(1)} className="p-1 cursor-pointer hover:text-primary" />
          </div>
        </div>
      </div>

      {/* Toolbar: client selector + status filter chips */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative" ref={selectorRef}>
          <button
            onClick={() => setSelectorOpen((o) => !o)}
            disabled={groupsState !== 'ready'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline text-sm text-on-surface hover:border-primary transition-colors disabled:opacity-50"
          >
            <Icon name="groups" className="text-base text-on-surface-variant" />
            <span className="font-medium">{selectorLabel}</span>
            <Icon name={selectorOpen ? 'expand_less' : 'expand_more'} className="text-base text-on-surface-variant" />
          </button>

          {selectorOpen && groupsState === 'ready' && (
            <div className="absolute z-40 mt-2 w-72 max-h-96 flex flex-col bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-outline">
                <span className="text-[10px] font-label-mono uppercase text-on-surface-variant tracking-widest">
                  {selectedCount}/{allIds.length} selected
                </span>
                <div className="flex gap-3 text-xs">
                  <button onClick={() => setSelected(new Set(allIds))} className="text-primary hover:underline font-bold">All</button>
                  <button onClick={() => setSelected(new Set())} className="text-on-surface-variant hover:text-on-surface">Clear</button>
                </div>
              </div>
              <div className="overflow-y-auto custom-scrollbar py-1">
                {groups.map((g) => {
                  const gs = groupState(g)
                  const isOpen = expanded.has(g.id)
                  return (
                    <div key={g.id}>
                      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-variant/20">
                        <button onClick={() => toggleGroup(g)} className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckBox state={gs} />
                          <span className="text-sm font-bold text-on-surface truncate">{g.name}</span>
                          <span className="text-[10px] text-on-surface-variant ml-auto shrink-0">{g.profiles.length}</span>
                        </button>
                        <Icon
                          name={isOpen ? 'expand_less' : 'expand_more'}
                          onClick={() => toggleExpand(g.id)}
                          className="text-base text-on-surface-variant cursor-pointer hover:text-primary p-0.5"
                        />
                      </div>
                      {isOpen &&
                        g.profiles.map((p) => {
                          const ns = networkStyle(p.network)
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleProfile(p.id)}
                              className="flex items-center gap-2 w-full pl-8 pr-3 py-1 hover:bg-surface-variant/20"
                            >
                              <CheckBox state={selected.has(p.id) ? 'on' : 'off'} />
                              <Icon name={ns.icon} className="text-[13px] text-on-surface-variant shrink-0" />
                              <span className="text-xs text-on-surface/80 truncate">{p.name}</span>
                              <span className="text-[9px] text-on-surface-variant ml-auto shrink-0">{ns.label}</span>
                            </button>
                          )
                        })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const active = statusFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  active ? 'border-primary text-primary bg-primary/10' : 'border-outline text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {truncated && (
        <div className="mb-4 flex items-center gap-2 text-[11px] text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
          <Icon name="info" className="text-sm" />
          Showing the first 500 posts from this range — some later days this month may be hidden.
        </div>
      )}

      {(state === 'error' || groupsState === 'error') && (
        <div className="mb-4 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <Icon name="error" className="text-sm" />
          <span className="flex-1">{groupsState === 'error' ? 'Failed to load clients.' : error}</span>
          <button
            onClick={groupsState === 'error' ? () => window.location.reload() : loadPosts}
            className="font-bold uppercase tracking-widest hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Month / Week grid */}
      {view !== 'day' && (
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center font-label-mono text-[10px] text-on-surface-variant pb-2 border-b border-outline">
              {d}
            </div>
          ))}
          {(view === 'week' ? weekCells : monthGrid).map((cell) => (
            <GridCell key={cell.key} cell={cell} tall={view === 'week'} />
          ))}
        </div>
      )}

      {/* Day agenda */}
      {view === 'day' && (
        <div className="min-h-[300px]">
          {dayPosts.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center gap-2">
              <Icon name="event_busy" className="text-3xl text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant">No posts on this day.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayPosts.map((p) => <PostCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      )}

      {/* Day detail modal (month/week cell click) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-surface-container border border-outline rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-outline">
              <div>
                <h4 className="font-headline-lg text-on-surface text-lg">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h4>
                <p className="text-xs text-on-surface-variant">
                  {selectedPosts.length} post{selectedPosts.length === 1 ? '' : 's'}
                </p>
              </div>
              <Icon name="close" onClick={() => setSelectedDay(null)} className="p-1 cursor-pointer hover:text-primary" />
            </div>
            <div className="overflow-y-auto custom-scrollbar p-5 space-y-3">
              {selectedPosts
                .slice()
                .sort((a, b) => (a.publishAt || '').localeCompare(b.publishAt || ''))
                .map((p) => <PostCard key={p.id} p={p} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

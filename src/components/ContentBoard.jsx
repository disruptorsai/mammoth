import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from './Icon'
import { useClient } from '../context/ClientContext'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  CONTENT_COLUMNS,
  fetchContentPosts,
  createContentPost,
  updateContentPost,
  deleteContentPost,
  positionBetween,
} from '../lib/contentBoard'

const COLUMN_KEYS = CONTENT_COLUMNS.map((c) => c.key)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function groupByColumn(rows) {
  const map = Object.fromEntries(COLUMN_KEYS.map((k) => [k, []]))
  for (const r of rows) (map[r.column_key] ?? map.idea).push(r)
  for (const k of COLUMN_KEYS) map[k].sort((a, b) => a.position - b.position)
  return map
}

function formatDate(value) {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return value
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`
}

function isoOffset(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---- Presentational card ----------------------------------------------------
function CardView({ post, dragging = false, listeners, attributes, onOpen }) {
  return (
    <div
      onClick={onOpen}
      className={`bg-surface-container rounded-[6px] p-4 group transition-colors select-none ${
        dragging
          ? 'border border-primary shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-grabbing'
          : 'border border-outline hover:border-primary cursor-grab'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        {post.channel ? (
          <span className="font-label-mono text-[10px] text-primary px-2 py-0.5 bg-primary/10 rounded-[4px] uppercase tracking-tighter truncate">
            {post.channel}
          </span>
        ) : (
          <span />
        )}
        <Icon
          name="drag_indicator"
          className="text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </div>
      <h4 className="font-body-md text-on-surface font-semibold mb-1.5 leading-tight">{post.title}</h4>
      {post.caption && (
        <p className="text-on-surface-variant text-[13px] mb-3 line-clamp-3">{post.caption}</p>
      )}
      <div className="flex items-center justify-between mt-auto gap-2">
        {post.scheduled_for ? (
          <div className="flex items-center gap-1 text-on-surface-variant text-[11px] font-label-mono">
            <Icon name="event" className="text-sm" />
            <span>{formatDate(post.scheduled_for)}</span>
          </div>
        ) : (
          <span />
        )}
        <Icon
          name="edit"
          className="text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </div>
    </div>
  )
}

function SortableCard({ post, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style}>
      <CardView post={post} attributes={attributes} listeners={listeners} onOpen={onOpen} />
    </div>
  )
}

function Column({ column, posts, onAdd, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })
  return (
    <div className="flex-1 flex flex-col min-w-[260px] gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h4 className="font-headline-lg text-[15px] text-on-surface font-bold">{column.title}</h4>
          <span className="px-2 py-0.5 rounded-full font-label-mono text-[10px] bg-surface-container text-on-surface-variant">
            {posts.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(column.key)}
          className="p-1 hover:text-primary transition-colors"
          aria-label={`Add to ${column.title}`}
        >
          <Icon name="add" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-3 pr-1 rounded-lg transition-colors min-h-[120px] ${
          isOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''
        }`}
      >
        <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {posts.map((post) => (
            <SortableCard key={post.id} post={post} onOpen={() => onOpen(post)} />
          ))}
        </SortableContext>
        {posts.length === 0 && (
          <button
            onClick={() => onAdd(column.key)}
            className="w-full border border-dashed border-outline rounded-[6px] py-6 text-on-surface-variant text-xs hover:border-primary hover:text-primary transition-colors"
          >
            + Add a post
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Edit / create modal ----------------------------------------------------
const EMPTY = { title: '', caption: '', channel: '', scheduled_for: '', column_key: 'idea' }

function PostModal({ post, onClose, onSave, onDelete }) {
  const isNew = !post.id
  const [form, setForm] = useState({
    title: post.title ?? '',
    caption: post.caption ?? '',
    channel: post.channel ?? '',
    scheduled_for: post.scheduled_for ?? '',
    column_key: post.column_key ?? 'idea',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const DATE_CHIPS = [
    { label: 'None', value: '' },
    { label: 'Today', value: isoOffset(0) },
    { label: 'Tomorrow', value: isoOffset(1) },
    { label: '+1 week', value: isoOffset(7) },
  ]

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({ ...form, title: form.title.trim() })
  }

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
          <h3 className="font-headline-lg text-xl text-primary">{isNew ? 'New Post' : 'Edit Post'}</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Title</span>
          <input
            autoFocus
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Q4 launch teaser"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Caption</span>
          <textarea
            value={form.caption}
            onChange={set('caption')}
            rows={3}
            placeholder="The post copy…"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
          />
        </label>

        {/* Stage pills */}
        <div>
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Stage</span>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {CONTENT_COLUMNS.map((c) => {
              const active = form.column_key === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, column_key: c.key }))}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'gold-gradient text-on-primary border-transparent font-bold'
                      : 'bg-surface-container-low border-outline text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {c.title}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Channel</span>
          <input
            value={form.channel}
            onChange={set('channel')}
            placeholder="e.g. Instagram, LinkedIn"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        {/* Schedule date with quick chips */}
        <div>
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Schedule</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {DATE_CHIPS.map((chip) => {
              const active = form.scheduled_for === chip.value
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, scheduled_for: chip.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary/15 border-primary text-primary'
                      : 'bg-surface-container-low border-outline text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
            <input
              type="date"
              value={form.scheduled_for}
              onChange={set('scheduled_for')}
              className="bg-surface-container-low border border-outline rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>
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
              className="gold-gradient text-on-primary font-bold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ---- Board ------------------------------------------------------------------
export default function ContentBoard() {
  const { activeClient } = useClient()
  const clientId = activeClient.id

  const [columns, setColumns] = useState(() => groupByColumn([]))
  const columnsRef = useRef(columns)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [modal, setModal] = useState(null)

  const commit = useCallback((next) => {
    columnsRef.current = next
    setColumns(next)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchContentPosts(clientId)
      commit(groupByColumn(rows))
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [clientId, commit])

  useEffect(() => {
    reload()
  }, [reload])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findContainer = (id) => {
    if (COLUMN_KEYS.includes(id)) return id
    return COLUMN_KEYS.find((k) => columnsRef.current[k].some((p) => p.id === id))
  }

  const activePost = activeId
    ? Object.values(columnsRef.current).flat().find((p) => p.id === activeId)
    : null

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    const from = findContainer(active.id)
    const to = findContainer(over.id)
    if (!from || !to || from === to) return
    const cur = columnsRef.current
    const fromItems = cur[from]
    const toItems = cur[to]
    const moved = fromItems.find((p) => p.id === active.id)
    if (!moved) return
    const overIndex = COLUMN_KEYS.includes(over.id)
      ? toItems.length
      : toItems.findIndex((p) => p.id === over.id)
    const insertAt = overIndex < 0 ? toItems.length : overIndex
    commit({
      ...cur,
      [from]: fromItems.filter((p) => p.id !== active.id),
      [to]: [...toItems.slice(0, insertAt), { ...moved, column_key: to }, ...toItems.slice(insertAt)],
    })
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const container = findContainer(over.id)
    const from = findContainer(active.id)
    if (!container || !from) return
    const cur = columnsRef.current
    let items = cur[container]
    const oldIndex = items.findIndex((p) => p.id === active.id)
    const overIndex = COLUMN_KEYS.includes(over.id)
      ? items.length - 1
      : items.findIndex((p) => p.id === over.id)
    if (oldIndex !== overIndex && overIndex >= 0) {
      items = arrayMove(items, oldIndex, overIndex)
      commit({ ...cur, [container]: items })
    }
    const index = items.findIndex((p) => p.id === active.id)
    const before = items[index - 1]?.position ?? null
    const after = items[index + 1]?.position ?? null
    const position = positionBetween(before, after)
    const withPos = columnsRef.current[container].map((p) =>
      p.id === active.id ? { ...p, position, column_key: container } : p,
    )
    commit({ ...columnsRef.current, [container]: withPos })

    if (!isSupabaseConfigured) return
    try {
      await updateContentPost(active.id, { column_key: container, position })
    } catch (e) {
      setError(e.message ?? String(e))
      reload()
    }
  }

  function openCreate(columnKey) {
    setModal({ post: { ...EMPTY, column_key: columnKey } })
  }
  function openEdit(post) {
    setModal({ post })
  }

  async function savePost(fields) {
    const editing = modal.post
    setModal(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.')
      return
    }
    try {
      if (editing.id) {
        const targetCol = columnsRef.current[fields.column_key] ?? []
        const last = targetCol[targetCol.length - 1]
        const position =
          editing.column_key === fields.column_key
            ? editing.position
            : positionBetween(last?.position ?? null, null)
        await updateContentPost(editing.id, { ...fields, position })
      } else {
        const col = columnsRef.current[fields.column_key] ?? []
        const last = col[col.length - 1]
        const position = positionBetween(last?.position ?? null, null)
        await createContentPost(clientId, fields.column_key, fields, position)
      }
      reload()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  async function removePost() {
    const editing = modal.post
    setModal(null)
    if (!editing.id) return
    try {
      await deleteContentPost(editing.id)
      reload()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  return (
    <div className="col-span-12 bg-surface-container border border-outline rounded-xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Content Board</h3>
          {loading && <Icon name="progress_activity" className="animate-spin text-primary text-base" />}
          <span className="text-sm text-on-surface-variant">
            {activeClient.name}
          </span>
        </div>
        <button
          onClick={() => openCreate('idea')}
          className="gold-gradient text-on-primary font-bold px-4 py-2 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
        >
          <Icon name="add" /> New Post
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-4 p-3 rounded-lg border border-primary/40 bg-primary/5 text-sm text-on-surface-variant">
          <Icon name="info" className="text-primary text-base align-middle mr-1" />
          Supabase isn’t configured — add your keys to <code className="font-label-mono">.env</code> and run{' '}
          <code className="font-label-mono text-primary">0003_content_board.sql</code>. Drag works locally but won’t save.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-error/50 bg-error/10 text-sm text-error">{error}</div>
      )}

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-[900px]">
            {CONTENT_COLUMNS.map((col) => (
              <Column
                key={col.key}
                column={col}
                posts={columns[col.key]}
                onAdd={openCreate}
                onOpen={openEdit}
              />
            ))}
          </div>
          <DragOverlay>{activePost ? <CardView post={activePost} dragging /> : null}</DragOverlay>
        </DndContext>
      </div>

      {modal && (
        <PostModal
          post={modal.post}
          onClose={() => setModal(null)}
          onSave={savePost}
          onDelete={removePost}
        />
      )}
    </div>
  )
}

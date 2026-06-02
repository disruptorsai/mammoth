import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import Fab from '../components/Fab'
import { useClient } from '../context/ClientContext'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  BOARD_COLUMNS,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  positionBetween,
} from '../lib/tasks'

const COLUMN_KEYS = BOARD_COLUMNS.map((c) => c.key)

// Group a flat task list into a { columnKey: [tasks] } map, ordered by position.
function groupByColumn(tasks) {
  const map = Object.fromEntries(COLUMN_KEYS.map((k) => [k, []]))
  for (const t of tasks) (map[t.column_key] ?? map.todo).push(t)
  for (const k of COLUMN_KEYS) map[k].sort((a, b) => a.position - b.position)
  return map
}

const COUNT_CLASS = {
  todo: 'bg-surface-container text-on-surface-variant',
  in_progress: 'bg-primary text-on-primary',
  review: 'bg-surface-container text-on-surface-variant',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Display a stored due date (YYYY-MM-DD) as e.g. "Jun 15". Falls back to the raw
// string so older free-text labels still render.
function formatDue(value) {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return value
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`
}

// First+last initials for an assignee avatar (e.g. "Bryan Lee" -> "BL").
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

// YYYY-MM-DD for today + `days`, in local time (avoids the UTC off-by-one).
function isoOffset(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---- Presentational card (also used inside the DragOverlay) -----------------
function CardView({ task, dragging = false, listeners, attributes, onOpen }) {
  return (
    <div
      onClick={onOpen}
      className={`bg-surface-container rounded-[6px] p-5 group transition-colors select-none ${
        dragging
          ? 'border border-primary shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-grabbing'
          : 'border border-outline hover:border-primary cursor-grab'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-3">
        {task.tag ? (
          <span className="font-label-mono text-[10px] text-primary px-2 py-0.5 bg-primary/10 rounded-[4px] uppercase tracking-tighter">
            {task.tag}
          </span>
        ) : (
          <span />
        )}
        <Icon
          name="drag_indicator"
          className="text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      <h4 className="font-body-md text-on-surface font-semibold mb-2 leading-tight">{task.title}</h4>
      {task.description && (
        <p className="text-on-surface-variant text-[13px] mb-4 line-clamp-2">{task.description}</p>
      )}

      {typeof task.progress === 'number' && (
        <div className="w-full bg-surface-variant h-1 rounded-full mb-4 overflow-hidden">
          <div className="bg-primary h-full" style={{ width: `${task.progress}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between mt-auto gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {task.assignee && (
            <div className="flex items-center gap-1.5 min-w-0" title={`Assignee: ${task.assignee}`}>
              <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                {initials(task.assignee)}
              </span>
              <span className="text-[11px] text-on-surface-variant truncate">{task.assignee}</span>
            </div>
          )}
          {task.due_label && (
            <div className="flex items-center gap-1 text-on-surface-variant text-[11px] font-label-mono shrink-0">
              <Icon name="event" className="text-sm" />
              <span>{formatDue(task.due_label)}</span>
            </div>
          )}
        </div>
        <Icon
          name="edit"
          className="text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </div>
    </div>
  )
}

// ---- Sortable wrapper -------------------------------------------------------
function SortableCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <CardView task={task} attributes={attributes} listeners={listeners} onOpen={onOpen} />
    </div>
  )
}

// ---- Column (droppable so empty columns still accept drops) -----------------
function Column({ column, tasks, onAdd, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })
  return (
    <div className="flex-1 flex flex-col min-w-[300px] gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h3 className="font-headline-lg text-[18px] text-on-surface font-bold">{column.title}</h3>
          <span
            className={`px-2 py-0.5 rounded-full font-label-mono text-[10px] ${COUNT_CLASS[column.key]}`}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(column.key)}
          className="p-1 hover:text-primary transition-colors"
          aria-label={`Add task to ${column.title}`}
        >
          <Icon name="add" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-4 pr-1 rounded-lg transition-colors ${
          isOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpen={() => onOpen(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <button
            onClick={() => onAdd(column.key)}
            className="w-full border border-dashed border-outline rounded-[6px] py-8 text-on-surface-variant text-sm hover:border-primary hover:text-primary transition-colors"
          >
            + Add a task
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Edit / create modal ----------------------------------------------------
const EMPTY = { title: '', description: '', tag: '', due_label: '', progress: '', column_key: 'todo' }

function TaskModal({ task, onClose, onSave, onDelete }) {
  const isNew = !task.id
  const [form, setForm] = useState({
    title: task.title ?? '',
    description: task.description ?? '',
    tag: task.tag ?? '',
    assignee: task.assignee ?? '',
    due_label: task.due_label ?? '',
    progress: task.progress ?? '',
    column_key: task.column_key ?? 'todo',
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
    onSave({
      ...form,
      title: form.title.trim(),
      progress: form.progress === '' ? null : Math.max(0, Math.min(100, Number(form.progress))),
    })
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
          <h3 className="font-headline-lg text-xl text-primary">{isNew ? 'New Task' : 'Edit Task'}</h3>
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
            placeholder="What needs doing?"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Description</span>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
          />
        </label>

        {/* Column — one-click pills instead of a dropdown */}
        <div>
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Column</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {BOARD_COLUMNS.map((c) => {
              const active = form.column_key === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, column_key: c.key }))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? 'gold-gradient text-black border-transparent font-bold'
                      : 'bg-surface-container-low border-outline text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {c.title}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Tag</span>
            <input
              value={form.tag}
              onChange={set('tag')}
              placeholder="e.g. Campaign"
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Assignee</span>
            <input
              value={form.assignee}
              onChange={set('assignee')}
              placeholder="e.g. Bryan"
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>
        </div>

        {/* Due date — quick chips cover the common cases; calendar only for custom dates */}
        <div>
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Due date</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {DATE_CHIPS.map((chip) => {
              const active = form.due_label === chip.value
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, due_label: chip.value }))}
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
              value={form.due_label}
              onChange={set('due_label')}
              className="bg-surface-container-low border border-outline rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Progress — slider, with a clear "not tracked" state */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Progress</span>
            <span className="text-xs font-label-mono text-primary">
              {form.progress === '' ? 'Not tracked' : `${form.progress}%`}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.progress === '' ? 0 : form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
              className="flex-1 accent-primary"
            />
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, progress: f.progress === '' ? 0 : '' }))
              }
              className="text-xs font-medium text-on-surface-variant hover:text-primary whitespace-nowrap"
            >
              {form.progress === '' ? 'Track' : 'Clear'}
            </button>
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

// ---- Page -------------------------------------------------------------------
export default function TaskManagement() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const clientId = activeClient.id

  const [columns, setColumns] = useState(() => groupByColumn([]))
  const columnsRef = useRef(columns)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [modal, setModal] = useState(null) // { task } for edit/create, or null

  // Keep a synchronous mirror of columns for use inside drag handlers.
  const commit = useCallback((next) => {
    columnsRef.current = next
    setColumns(next)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const tasks = await fetchTasks(clientId)
      commit(groupByColumn(tasks))
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [clientId, commit])

  // Reload whenever the active client changes.
  useEffect(() => {
    reload()
  }, [reload])

  const sensors = useSensors(
    // 8px activation distance so a plain click opens the editor instead of dragging.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findContainer = (id) => {
    if (COLUMN_KEYS.includes(id)) return id
    return COLUMN_KEYS.find((k) => columnsRef.current[k].some((t) => t.id === id))
  }

  const activeTask = activeId
    ? Object.values(columnsRef.current).flat().find((t) => t.id === activeId)
    : null

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  // Live-move the card into the hovered column while dragging across columns.
  function handleDragOver({ active, over }) {
    if (!over) return
    const from = findContainer(active.id)
    const to = findContainer(over.id)
    if (!from || !to || from === to) return

    const cur = columnsRef.current
    const fromItems = cur[from]
    const toItems = cur[to]
    const moved = fromItems.find((t) => t.id === active.id)
    if (!moved) return

    const overIndex = COLUMN_KEYS.includes(over.id)
      ? toItems.length
      : toItems.findIndex((t) => t.id === over.id)
    const insertAt = overIndex < 0 ? toItems.length : overIndex

    commit({
      ...cur,
      [from]: fromItems.filter((t) => t.id !== active.id),
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
    const oldIndex = items.findIndex((t) => t.id === active.id)
    const overIndex = COLUMN_KEYS.includes(over.id)
      ? items.length - 1
      : items.findIndex((t) => t.id === over.id)

    if (oldIndex !== overIndex && overIndex >= 0) {
      items = arrayMove(items, oldIndex, overIndex)
      commit({ ...cur, [container]: items })
    }

    // Compute the dragged card's new fractional position from its neighbors.
    const index = items.findIndex((t) => t.id === active.id)
    const before = items[index - 1]?.position ?? null
    const after = items[index + 1]?.position ?? null
    const position = positionBetween(before, after)

    // Reflect the new position/column locally, then persist.
    const withPos = columnsRef.current[container].map((t) =>
      t.id === active.id ? { ...t, position, column_key: container } : t,
    )
    commit({ ...columnsRef.current, [container]: withPos })

    if (!isSupabaseConfigured) return
    try {
      await updateTask(active.id, { column_key: container, position })
    } catch (e) {
      setError(e.message ?? String(e))
      reload()
    }
  }

  function openCreate(columnKey) {
    setModal({ task: { ...EMPTY, column_key: columnKey } })
  }
  function openEdit(task) {
    setModal({ task })
  }

  async function saveTask(fields) {
    const editing = modal.task
    setModal(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.')
      return
    }
    try {
      if (editing.id) {
        // If the column changed via the dropdown, drop it at the end of the target column.
        const targetCol = columnsRef.current[fields.column_key] ?? []
        const last = targetCol[targetCol.length - 1]
        const position =
          editing.column_key === fields.column_key
            ? editing.position
            : positionBetween(last?.position ?? null, null)
        await updateTask(editing.id, { ...fields, position })
      } else {
        const col = columnsRef.current[fields.column_key] ?? []
        const last = col[col.length - 1]
        const position = positionBetween(last?.position ?? null, null)
        await createTask(clientId, fields.column_key, fields, position)
      }
      reload()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  async function removeTask() {
    const editing = modal.task
    setModal(null)
    if (!editing.id) return
    try {
      await deleteTask(editing.id)
      reload()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  return (
    <>
      <TopBar title="Task Board" searchPlaceholder="Search tasks…" onMenu={openNav} />

      {/* Per-client context line */}
      <div className="flex items-center justify-between px-margin-mobile md:px-margin-desktop border-b border-outline py-3">
        <p className="text-sm text-on-surface-variant">
          Board for <span className="text-primary font-medium">{activeClient.name}</span>
        </p>
        {loading && <span className="text-xs font-label-mono text-on-surface-variant">Loading…</span>}
      </div>

      {!isSupabaseConfigured && (
        <div className="mx-margin-mobile md:mx-margin-desktop mt-4 p-3 rounded-lg border border-primary/40 bg-primary/5 text-sm text-on-surface-variant">
          <Icon name="info" className="text-primary text-base align-middle mr-1" />
          Supabase isn't configured yet. Add <code className="font-label-mono text-primary">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-label-mono text-primary">VITE_SUPABASE_ANON_KEY</code> to <code className="font-label-mono">.env</code>, then restart the dev server. Drag still works locally but won't save.
        </div>
      )}

      {error && (
        <div className="mx-margin-mobile md:mx-margin-desktop mt-4 p-3 rounded-lg border border-error/50 bg-error/10 text-sm text-error">
          {error}
        </div>
      )}

      <div className="p-margin-mobile md:p-margin-desktop overflow-x-auto overflow-y-hidden flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-gutter min-w-[1000px]">
            {BOARD_COLUMNS.map((col) => (
              <Column
                key={col.key}
                column={col}
                tasks={columns[col.key]}
                onAdd={openCreate}
                onOpen={openEdit}
              />
            ))}
          </div>

          <DragOverlay>{activeTask ? <CardView task={activeTask} dragging /> : null}</DragOverlay>
        </DndContext>
      </div>

      {modal && (
        <TaskModal
          task={modal.task}
          onClose={() => setModal(null)}
          onSave={saveTask}
          onDelete={removeTask}
        />
      )}

      <Fab icon="add" title="New task" onClick={() => openCreate('todo')} />
    </>
  )
}

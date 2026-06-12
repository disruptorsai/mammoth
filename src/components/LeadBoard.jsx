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
  LEAD_STAGES,
  fetchLeads,
  createLead,
  updateLead,
  deleteLead,
  positionBetween,
} from '../lib/leads'
import { formatMoney } from '../lib/adCampaigns'

const STAGE_KEYS = LEAD_STAGES.map((s) => s.key)

function groupByStage(rows) {
  const map = Object.fromEntries(STAGE_KEYS.map((k) => [k, []]))
  for (const r of rows) (map[r.stage_key] ?? map.new).push(r)
  for (const k of STAGE_KEYS) map[k].sort((a, b) => a.position - b.position)
  return map
}

const SOURCE_STYLES = {
  ghl: 'bg-primary/10 text-primary border border-primary/20',
  manual: 'bg-surface-variant text-on-surface-variant border border-outline',
}

// ---- Card --------------------------------------------------------------------
function CardView({ lead, dragging = false, listeners, attributes, onOpen }) {
  return (
    <div
      onClick={onOpen}
      className={`bg-surface-container-low rounded-xl p-4 space-y-2 group transition-colors select-none ${
        dragging
          ? 'border border-primary shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-grabbing'
          : 'border border-outline hover:border-primary cursor-grab'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-start gap-2">
        <span
          className={`text-[10px] px-2 py-0.5 rounded uppercase ${SOURCE_STYLES[lead.source] || SOURCE_STYLES.manual}`}
        >
          {lead.source === 'ghl' ? 'GoHighLevel' : 'Manual'}
        </span>
        {Number(lead.value) > 0 && (
          <span className="text-[10px] text-on-surface-variant font-label-mono shrink-0">
            {formatMoney(Number(lead.value))}
          </span>
        )}
      </div>
      <p className="font-bold text-on-surface leading-tight">{lead.name}</p>
      {lead.company && (
        <p className="text-xs text-on-surface-variant truncate">{lead.company}</p>
      )}
      <div className="flex justify-end">
        <Icon
          name="edit"
          className="text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  )
}

function SortableCard({ lead, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style}>
      <CardView lead={lead} attributes={attributes} listeners={listeners} onOpen={onOpen} />
    </div>
  )
}

function Column({ stage, leads, onAdd, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full" />
          <span className="text-xs font-label-mono uppercase tracking-tighter opacity-60">
            {stage.title} ({leads.length})
          </span>
        </div>
        <button
          onClick={() => onAdd(stage.key)}
          className="p-0.5 hover:text-primary transition-colors"
          aria-label={`Add lead to ${stage.title}`}
        >
          <Icon name="add" className="text-base" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 rounded-xl transition-colors min-h-[120px] p-0.5 ${
          isOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''
        }`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableCard key={lead.id} lead={lead} onOpen={() => onOpen(lead)} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <button
            onClick={() => onAdd(stage.key)}
            className="w-full border-2 border-dashed border-outline rounded-xl h-24 flex items-center justify-center text-on-surface-variant text-xs font-label-mono hover:border-primary hover:text-primary transition-colors"
          >
            + Add lead
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Modal --------------------------------------------------------------------
const EMPTY = { name: '', company: '', value: '', stage_key: 'new' }

function LeadModal({ lead, onClose, onSave, onDelete }) {
  const isNew = !lead.id
  const [form, setForm] = useState({
    name: lead.name ?? '',
    company: lead.company ?? '',
    value: lead.value != null && Number(lead.value) > 0 ? String(lead.value) : '',
    stage_key: lead.stage_key ?? 'new',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      company: form.company.trim(),
      value: form.value === '' ? 0 : Math.max(0, Number(form.value) || 0),
      stage_key: form.stage_key,
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
        className="bg-surface-container border border-outline rounded-xl w-full max-w-md p-6 space-y-4 animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-lg text-xl text-primary">{isNew ? 'New Lead' : 'Edit Lead'}</h3>
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
            placeholder="e.g. Alex Rivera"
            className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Company</span>
            <input
              value={form.company}
              onChange={set('company')}
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Value ($)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={set('value')}
              placeholder="0"
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>
        </div>

        <div>
          <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Stage</span>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {LEAD_STAGES.map((s) => {
              const active = form.stage_key === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, stage_key: s.key }))}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${
                    active
                      ? 'gold-gradient text-black border-transparent font-bold'
                      : 'bg-surface-container-low border-outline text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {s.title.split(' ')[0]}
                </button>
              )
            })}
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

// ---- Board ---------------------------------------------------------------------
// onChanged: parent callback fired after any persisted change (so the
// interaction stream / selected lead can refresh). createRef: optional ref the
// parent can call as createRef.current() to open the "new lead" modal (FAB).
export default function LeadBoard({ onChanged, onSelectLead, refreshKey = 0, createRef }) {
  const { activeClient } = useClient()
  const clientId = activeClient.id

  const [columns, setColumns] = useState(() => groupByStage([]))
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
      const rows = await fetchLeads(clientId)
      commit(groupByStage(rows))
    } catch (e) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [clientId, commit])

  useEffect(() => {
    reload()
  }, [reload, refreshKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findContainer = (id) => {
    if (STAGE_KEYS.includes(id)) return id
    return STAGE_KEYS.find((k) => columnsRef.current[k].some((l) => l.id === id))
  }

  const activeLead = activeId
    ? Object.values(columnsRef.current).flat().find((l) => l.id === activeId)
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
    const moved = fromItems.find((l) => l.id === active.id)
    if (!moved) return
    const overIndex = STAGE_KEYS.includes(over.id)
      ? toItems.length
      : toItems.findIndex((l) => l.id === over.id)
    const insertAt = overIndex < 0 ? toItems.length : overIndex
    commit({
      ...cur,
      [from]: fromItems.filter((l) => l.id !== active.id),
      [to]: [...toItems.slice(0, insertAt), { ...moved, stage_key: to }, ...toItems.slice(insertAt)],
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
    const oldIndex = items.findIndex((l) => l.id === active.id)
    const overIndex = STAGE_KEYS.includes(over.id)
      ? items.length - 1
      : items.findIndex((l) => l.id === over.id)
    if (oldIndex !== overIndex && overIndex >= 0) {
      items = arrayMove(items, oldIndex, overIndex)
      commit({ ...cur, [container]: items })
    }
    const index = items.findIndex((l) => l.id === active.id)
    const before = items[index - 1]?.position ?? null
    const after = items[index + 1]?.position ?? null
    const position = positionBetween(before, after)
    const withPos = columnsRef.current[container].map((l) =>
      l.id === active.id ? { ...l, position, stage_key: container } : l,
    )
    commit({ ...columnsRef.current, [container]: withPos })

    if (!isSupabaseConfigured) return
    try {
      await updateLead(active.id, { stage_key: container, position })
      onChanged?.()
    } catch (e) {
      setError(e.message ?? String(e))
      reload()
    }
  }

  function openCreate(stageKey) {
    setModal({ lead: { ...EMPTY, stage_key: stageKey } })
  }
  function openEdit(lead) {
    setModal({ lead })
    onSelectLead?.(lead)
  }

  async function saveLead(fields) {
    const editing = modal.lead
    setModal(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured — add the keys to .env.')
      return
    }
    try {
      if (editing.id) {
        const targetCol = columnsRef.current[fields.stage_key] ?? []
        const last = targetCol[targetCol.length - 1]
        const position =
          editing.stage_key === fields.stage_key
            ? editing.position
            : positionBetween(last?.position ?? null, null)
        await updateLead(editing.id, { ...fields, position })
      } else {
        const col = columnsRef.current[fields.stage_key] ?? []
        const last = col[col.length - 1]
        const position = positionBetween(last?.position ?? null, null)
        await createLead(clientId, fields.stage_key, fields, position)
      }
      await reload()
      onChanged?.()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  async function removeLead() {
    const editing = modal.lead
    setModal(null)
    if (!editing.id) return
    try {
      await deleteLead(editing.id)
      await reload()
      onChanged?.()
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  // Expose the "new lead" trigger to the parent (page FAB).
  if (createRef) createRef.current = () => openCreate('new')

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-error/50 bg-error/10 text-sm text-error">{error}</div>
      )}
      {loading && (
        <p className="text-xs font-label-mono text-on-surface-variant">Loading pipeline…</p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {LEAD_STAGES.map((stage) => (
            <Column
              key={stage.key}
              stage={stage}
              leads={columns[stage.key]}
              onAdd={openCreate}
              onOpen={openEdit}
            />
          ))}
        </div>
        <DragOverlay>{activeLead ? <CardView lead={activeLead} dragging /> : null}</DragOverlay>
      </DndContext>

      {modal && (
        <LeadModal
          lead={modal.lead}
          onClose={() => setModal(null)}
          onSave={saveLead}
          onDelete={removeLead}
        />
      )}
    </div>
  )
}

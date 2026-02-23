import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, Trash2, AlertTriangle, Check, ExternalLink, Send } from 'lucide-react'
import { TYPE_ICONS } from '../icons'
import Avatar from '../ui/Avatar'
import { api } from '../../api/client'

// Build breadcrumb trail by walking up parentId chain
function buildBreadcrumb(item, itemMap, meridianMap) {
  const trail = []
  let current = item
  while (current) {
    trail.unshift(current.title)
    current = current.parentId ? itemMap[current.parentId] : null
  }
  const meridian = meridianMap[item.meridianId]
  if (meridian) trail.unshift(meridian.name)
  return trail
}

function ActivityEntry({ entry, userMap, statusMap }) {
  const user = userMap[entry.userId]
  const time = new Date(entry.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  let text = ''
  if (entry.action === 'created') {
    text = 'created this item'
  } else if (entry.action === 'status_changed') {
    const newStatus = statusMap?.[parseInt(entry.newValue)]
    text = `changed status to "${newStatus?.name ?? entry.newValue}"`
  } else if (entry.action === 'assigned') {
    const assignee = entry.newValue ? userMap[parseInt(entry.newValue)] : null
    text = assignee ? `assigned to ${assignee.displayName}` : 'removed assignee'
  } else if (entry.action === 'edited') {
    text = `updated ${entry.fieldName}`
  } else if (entry.action === 'commented') {
    text = entry.note
  }

  return (
    <div className="flex gap-2.5 text-xs">
      <Avatar user={user} size={20} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-gray-800 font-medium">{user?.displayName}</span>
        {entry.action === 'commented'
          ? <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{text}</p>
          : <span className="text-gray-500"> {text}</span>
        }
        <div className="text-gray-400 mt-0.5">{time}</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100">
      {title && <div className="text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</div>}
      {children}
    </div>
  )
}

// ── Editable inline select ────────────────────────────────────────────────────

/**
 * options: Array<{ id, label, color?, user? }>
 * nullLabel: string → enables a null option with this label
 * renderSelected: (opt | null) => ReactNode — custom display for the trigger
 */
function EditSelect({ value, onChange, options, nullLabel, renderSelected }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.id === value) ?? null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded px-1.5 py-0.5 -mx-1.5 hover:bg-gray-100 transition-colors group"
      >
        {renderSelected
          ? renderSelected(selected)
          : (
            <>
              {selected?.color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
              )}
              {selected?.user && <Avatar user={selected.user} size={16} />}
              <span className={`text-sm ${selected ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                {selected?.label ?? nullLabel ?? '—'}
              </span>
            </>
          )
        }
        <ChevronDown
          size={11}
          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {nullLabel !== undefined && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              className={`flex items-center w-full px-3 py-1.5 text-sm italic hover:bg-gray-50 text-left ${value === null ? 'text-meridian-600 font-medium' : 'text-gray-400'}`}
            >
              {nullLabel}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-gray-50 transition-colors ${value === opt.id ? 'bg-meridian-50 text-meridian-700 font-medium' : 'text-gray-700'}`}
            >
              {opt.color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
              )}
              {opt.user && <Avatar user={opt.user} size={16} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

// ── Editable title ────────────────────────────────────────────────────────────

function EditableTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const inputRef = useRef(null)

  useEffect(() => { setDraft(value); setEditing(false) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          className="flex-1 text-gray-900 font-medium leading-snug bg-transparent border-b border-meridian-400 outline-none text-sm py-0.5"
        />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); commit() }} className="p-0.5 text-teal-600 hover:text-teal-800">
          <Check size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex-1 text-left text-gray-900 font-medium leading-snug hover:text-meridian-700 transition-colors"
      title="Click to edit title"
    >
      {value}
    </button>
  )
}

// ── Editable description ──────────────────────────────────────────────────────

function EditableDescription({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value ?? '')
  const textareaRef = useRef(null)

  useEffect(() => { setDraft(value ?? ''); setEditing(false) }, [value])
  useEffect(() => { if (editing) { textareaRef.current?.focus(); textareaRef.current?.select() } }, [editing])

  function commit() {
    const trimmed = draft.trim()
    onSave(trimmed || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder="Add a description…"
          className="w-full text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-meridian-400"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => { setDraft(value ?? ''); setEditing(false) }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="text-xs font-medium text-white bg-meridian-600 hover:bg-meridian-700 px-2.5 py-1 rounded"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-left"
      title="Click to edit description"
    >
      {value
        ? <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap hover:text-gray-900 transition-colors">{value}</p>
        : <p className="text-sm text-gray-400 italic hover:text-gray-500 transition-colors">Click to add a description…</p>
      }
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SlidePanel({
  item,
  onClose,
  onUpdate,
  onDelete,
  statusMap,
  userMap,
  sprintMap,
  meridianMap,
  itemMap,
  childItems,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activity,          setActivity]          = useState([])
  const [activityLoading,   setActivityLoading]   = useState(false)
  const [comment,           setComment]           = useState('')
  const [submitting,        setSubmitting]        = useState(false)

  // Reset delete confirmation and reload activity whenever the selected item changes
  useEffect(() => {
    setShowDeleteConfirm(false)
    setComment('')
  }, [item?.id])

  useEffect(() => {
    if (!item?.id) return
    setActivity([])
    setActivityLoading(true)
    api.get(`/api/items/${item.id}/activity`)
      .then(setActivity)
      .catch(() => {})
      .finally(() => setActivityLoading(false))
  }, [item?.id])

  async function handleComment(e) {
    e.preventDefault()
    const text = comment.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      await api.post(`/api/items/${item.id}/activity`, { note: text })
      setComment('')
      const updated = await api.get(`/api/items/${item.id}/activity`)
      setActivity(updated)
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  if (!item) return null

  const Icon       = TYPE_ICONS[item.type]
  const breadcrumb = buildBreadcrumb(item, itemMap, meridianMap)

  // Derive option arrays from maps
  const statusOptions   = Object.values(statusMap)
    .filter((s) => s.meridianId === item.meridianId)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ id: s.id, label: s.name, color: s.color }))
  const userOptions     = Object.values(userMap).map((u)   => ({ id: u.id,  label: u.displayName, user: u        }))
  const sprintOptions   = Object.values(sprintMap)
    .filter((s) => s.meridianId === item.meridianId)
    .map((s) => ({ id: s.id, label: s.name }))
  const meridianOptions = Object.values(meridianMap).map((m) => ({ id: m.id, label: m.name,       color: m.color }))

  // Parent options — type depends on item type
  const PARENT_TYPE = { episode: 'arc', signal: 'episode', relay: 'signal' }
  const parentType  = PARENT_TYPE[item.type] ?? null
  const parentOptions = parentType
    ? Object.values(itemMap)
        .filter((i) => i.id !== item.id && i.type === parentType)
        .map((i) => ({ id: i.id, label: i.title }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : []

  function update(field, value) { onUpdate?.(item.id, field, value) }

  function handleOpenNewWindow() {
    const url = new URL(window.location.href)
    url.search = `?item=${item.id}`
    window.open(url.toString(), '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">

      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-2xs text-gray-400 mb-2 flex-wrap">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">›</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-gray-500' : ''}>{crumb}</span>
              </span>
            ))}
          </div>
          {/* Title */}
          <div className="flex items-start gap-2">
            {Icon && <Icon size={17} className={`mt-0.5 shrink-0 ${{arc:'text-violet-500',episode:'text-indigo-600',signal:'text-teal-500',relay:'text-orange-500'}[item.type] ?? 'text-gray-400'}`} />}
            <EditableTitle value={item.title} onSave={(v) => update('title', v)} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            type="button"
            onClick={handleOpenNewWindow}
            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Open in new window"
          >
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete item"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Delete confirmation strip */}
      {showDeleteConfirm && (
        <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-b border-red-200 shrink-0">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span className="text-xs text-red-700 flex-1">
            Delete this {item.type} and all its children?
          </span>
          <button
            type="button"
            onClick={() => onDelete?.(item.id)}
            className="text-xs font-medium px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Meta — all editable ── */}
      <Section>
        <div className="flex flex-wrap gap-x-6 gap-y-4">

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs text-gray-400 uppercase tracking-wider">Status</span>
            <EditSelect
              value={item.statusId}
              onChange={(v) => update('statusId', v)}
              options={statusOptions}
              renderSelected={(sel) => sel
                ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: sel.color + '22', color: sel.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sel.color }} />
                    {sel.label}
                  </span>
                )
                : <span className="text-sm text-gray-400 italic">—</span>
              }
            />
          </div>

          {/* Assignee */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs text-gray-400 uppercase tracking-wider">Assignee</span>
            <EditSelect
              value={item.assigneeId}
              onChange={(v) => update('assigneeId', v)}
              options={userOptions}
              nullLabel="Adrift"
              renderSelected={(sel) => sel
                ? (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Avatar user={sel.user} size={18} />
                    {sel.label}
                  </div>
                )
                : <span className="text-sm text-gray-400 italic">Adrift</span>
              }
            />
          </div>

          {/* Sprint — arcs span multiple sprints and are never sprint-assigned */}
          {item.type !== 'arc' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-2xs text-gray-400 uppercase tracking-wider">Sprint</span>
              <EditSelect
                value={item.sprintId}
                onChange={(v) => update('sprintId', v)}
                options={sprintOptions}
                nullLabel="None"
              />
            </div>
          )}

          {/* Meridian — only shown for Arcs, which directly own it */}
          {item.type === 'arc' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-2xs text-gray-400 uppercase tracking-wider">Meridian</span>
              <EditSelect
                value={item.meridianId}
                onChange={(v) => update('meridianId', v)}
                options={meridianOptions}
              />
            </div>
          )}

          {/* Parent — hidden for Arcs which have no parent */}
          {parentType && (
            <div className="flex flex-col gap-1.5">
              <span className="text-2xs text-gray-400 uppercase tracking-wider">
                Parent {parentType.charAt(0).toUpperCase() + parentType.slice(1)}
              </span>
              <EditSelect
                value={item.parentId}
                onChange={(v) => update('parentId', v)}
                options={parentOptions}
                nullLabel="None"
              />
            </div>
          )}

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs text-gray-400 uppercase tracking-wider">Start Date</span>
            <input
              type="date"
              value={item.startDate ? item.startDate.slice(0, 10) : ''}
              onChange={(e) => update('startDate', e.target.value || null)}
              className="h-7 px-2 rounded-md border border-gray-200 text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-400 focus:border-transparent"
            />
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs text-gray-400 uppercase tracking-wider">Due Date</span>
            <input
              type="date"
              value={item.dueDate ? item.dueDate.slice(0, 10) : ''}
              onChange={(e) => update('dueDate', e.target.value || null)}
              className="h-7 px-2 rounded-md border border-gray-200 text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-400 focus:border-transparent"
            />
          </div>

        </div>
      </Section>

      {/* Description */}
      <Section title="Description">
        <EditableDescription value={item.description} onSave={(v) => update('description', v)} />
      </Section>

      {/* Child items */}
      {childItems.length > 0 && (
        <Section title={`${childItems.length} child ${childItems.length === 1 ? 'item' : 'items'}`}>
          <div className="flex flex-col gap-1">
            {childItems.map((child) => {
              const ChildIcon   = TYPE_ICONS[child.type]
              const childStatus = statusMap[child.statusId]
              return (
                <div key={child.id} className="flex items-center gap-2 text-xs text-gray-500 py-0.5">
                  {ChildIcon && <ChildIcon size={12} className="shrink-0 text-gray-400" />}
                  <span className={`flex-1 truncate ${childStatus?.isComplete ? 'line-through text-gray-400' : ''}`}>
                    {child.title}
                  </span>
                  {childStatus && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: childStatus.color }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Activity */}
      <Section title="Activity">
        {activityLoading
          ? <p className="text-xs text-gray-400 italic">Loading…</p>
          : activity.length > 0
            ? (
              <div className="flex flex-col gap-3">
                {activity.map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} userMap={userMap} statusMap={statusMap} />
                ))}
              </div>
            )
            : <p className="text-xs text-gray-400 italic">No activity yet.</p>
        }

        {/* Comment form — writers only */}
        {onUpdate && (
          <form onSubmit={handleComment} className="flex gap-2 mt-3">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 text-xs px-2.5 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-meridian-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!comment.trim() || submitting}
              className="px-2.5 py-1.5 rounded bg-meridian-600 text-white text-xs font-medium disabled:opacity-40 hover:bg-meridian-700 transition-colors"
              title="Post comment"
            >
              <Send size={12} />
            </button>
          </form>
        )}
      </Section>

    </div>
  )
}

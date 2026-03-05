import { useState } from 'react'
import { GripVertical, CalendarDays, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TYPE_ICONS, IconTodo } from '../icons'
import { StatusDot } from '../ui/StatusChip'
import Avatar from '../ui/Avatar'

const TYPE_COLOR = {
  arc:     'text-violet-600',
  episode: 'text-indigo-600',
  signal:  'text-rose-600',
  relay:   'text-orange-500',
  todo:    'text-teal-500',
}

function formatDue(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function TodayItemRow({
  item,
  isSelected,
  onSelect,
  onStatusCycle,
  onUpdate,
  onRemoveFromPlan,
  statusMap,
  userMap,
  sprintMap,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const [editingDue, setEditingDue] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const Icon   = item.type === 'todo' ? IconTodo : TYPE_ICONS[item.type]
  const status = statusMap[item.statusId]
  const user   = userMap[item.assigneeId]
  const sprint = sprintMap[item.sprintId]
  const isComplete = status?.isComplete ?? false

  const rowBg = isSelected
    ? '#f0fdfa'
    : status?.isBlocked
      ? status.color + '14'
      : undefined

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: rowBg }}
      className={`
        group flex items-center gap-2 h-10 board-px border-b border-gray-100 cursor-pointer
        transition-colors hover:brightness-95
        ${isDragging ? 'bg-white shadow-xl rounded-lg border border-gray-200' : ''}
      `}
      onClick={() => onSelect(item.id)}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 p-0.5 rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      {/* Type icon */}
      {Icon && <Icon size={16} className={`shrink-0 ${TYPE_COLOR[item.type]}`} />}

      {/* Title */}
      <span className={`flex-1 truncate text-sm ${isComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>
        {item.title}
      </span>

      {/* Sprint tag — sprint items only */}
      {sprint && (
        <span className="hidden sm:inline-flex shrink-0 text-2xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
          {sprint.name}
        </span>
      )}

      {/* Due date — inline editable */}
      <div className="hidden sm:flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        {editingDue ? (
          <input
            type="date"
            autoFocus
            defaultValue={item.dueDate ? item.dueDate.slice(0, 10) : ''}
            onChange={(e) => { onUpdate(item.id, 'dueDate', e.target.value || null); setEditingDue(false) }}
            onBlur={() => setEditingDue(false)}
            className="h-6 text-2xs px-1.5 border border-meridian-300 rounded focus:outline-none focus:ring-1 focus:ring-meridian-400 bg-white"
          />
        ) : item.dueDate ? (
          <span
            onClick={onUpdate ? () => setEditingDue(true) : undefined}
            className={`inline-flex items-center text-2xs font-medium px-1.5 py-0.5 rounded ${onUpdate ? 'cursor-pointer' : ''} ${
              item.dueDate.slice(0, 10) < new Date().toLocaleDateString('en-CA') && !isComplete
                ? 'bg-red-50 text-red-500 ring-1 ring-red-200'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {formatDue(item.dueDate)}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDue(true)}
            className="p-0.5 rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Set due date"
          >
            <CalendarDays size={13} />
          </button>
        )}
      </div>

      {/* Assignee */}
      <Avatar user={user} size={20} className="shrink-0 opacity-50" />

      {/* Status dot */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <StatusDot status={status} onClick={() => onStatusCycle(item.id)} />
      </div>

      {/* Remove from plan — sprint items only */}
      {item.type !== 'todo' && onRemoveFromPlan && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemoveFromPlan(item.id) }}
          title="Remove from today's plan"
          className="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

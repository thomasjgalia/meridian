import { useState } from 'react'
import { ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { TYPE_ICONS } from '../icons'
import { StatusDot } from '../ui/StatusChip'
import Avatar from '../ui/Avatar'

// Left indent per depth level (px)
const INDENT = 14

// Subtle icon color per type
const TYPE_COLOR = {
  arc:     'text-violet-600',
  episode: 'text-indigo-600',
  signal:  'text-teal-600',
  relay:   'text-orange-500',
}

// Types that can have children added inline
const CAN_ADD_CHILD = { arc: true, episode: true, signal: true }

function formatDue(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function WorkItemRow({
  item,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onStatusCycle,
  onAddChild,
  onUpdate,
  statusMap,
  userMap,
  sprintMap,
  itemMap = {},
}) {
  const Icon       = TYPE_ICONS[item.type]
  const status     = statusMap[item.statusId]
  const user       = userMap[item.assigneeId]
  const sprint     = sprintMap[item.sprintId]
  const parentItem = item.parentId ? itemMap[item.parentId] : null

  const [editingDue, setEditingDue] = useState(false)

  const indentPx = `calc(var(--board-px) + ${depth * INDENT}px)`
  const rowBg = isSelected
    ? '#f0fdfa'
    : status?.isBlocked
      ? status.color + '14'
      : undefined

  return (
    <div
      onClick={() => onSelect(item.id)}
      className="group flex items-center gap-2.5 sm:gap-2 row-height sm:border-b sm:border-gray-100 mx-3 mb-1 sm:mx-0 sm:mb-0 bg-white sm:bg-transparent rounded-xl sm:rounded-none shadow-sm sm:shadow-none cursor-pointer hover:brightness-95 transition-all text-base sm:text-sm"
      style={{ paddingLeft: indentPx, paddingRight: 'var(--board-px)', backgroundColor: rowBg }}
    >
      {/* Expand / collapse toggle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(item.id) }}
        className={`
          flex items-center justify-center w-5 h-5 sm:w-4 sm:h-4 shrink-0 rounded
          text-gray-400 hover:text-gray-600 transition-colors
          ${!hasChildren ? 'invisible' : ''}
        `}
      >
        <ChevronRight
          size={13}
          className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Type icon */}
      {Icon && (
        <Icon size={18} className={`shrink-0 ${TYPE_COLOR[item.type]}`} />
      )}

      {/* Title + parent context + add-child */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={`truncate ${status?.isComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title}</span>
        {parentItem && (
          <span className="hidden md:block shrink-0 text-2xs text-gray-400 truncate max-w-[160px]">
            {parentItem.title}
          </span>
        )}
        {CAN_ADD_CHILD[item.type] && onAddChild && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddChild(item) }}
            title={`Add ${item.type === 'arc' ? 'Episode' : item.type === 'episode' ? 'Signal' : 'Relay'}`}
            className="shrink-0 p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Sprint tag */}
      {sprint && (
        <span className="hidden sm:inline-flex shrink-0 text-2xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
          {sprint.name}
        </span>
      )}

      {/* Due date — inline editable */}
      {(item.dueDate || onUpdate) && (
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
                item.dueDate.slice(0, 10) < new Date().toLocaleDateString('en-CA') && !status?.isComplete ? 'bg-red-50 text-red-500 ring-1 ring-red-200' : 'bg-gray-100 text-gray-400'
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
      )}

      {/* Assignee avatar */}
      <Avatar user={user} size={24} className="shrink-0 sm:w-5 sm:h-5 opacity-50" />

      {/* Status indicator */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0 p-2 -m-2 sm:p-0 sm:m-0">
        <StatusDot status={status} onClick={() => onStatusCycle(item.id)} />
      </div>
    </div>
  )
}

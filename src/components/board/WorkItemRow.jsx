import { ChevronRight, Plus } from 'lucide-react'
import { TYPE_ICONS } from '../icons'
import { StatusDot } from '../ui/StatusChip'
import Avatar from '../ui/Avatar'

// Left indent per depth level (px)
const INDENT = 20

// Subtle icon color per type
const TYPE_COLOR = {
  arc:     'text-violet-600',
  episode: 'text-indigo-600',
  signal:  'text-teal-600',
  relay:   'text-orange-500',
}

// Types that can have children added inline
const CAN_ADD_CHILD = { arc: true, episode: true, signal: true }

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

  const indentPx = `calc(var(--board-px) + ${depth * INDENT}px)`

  return (
    <div
      onClick={() => onSelect(item.id)}
      className={`
        group flex items-center gap-2.5 sm:gap-2 row-height border-b border-gray-100 cursor-pointer
        hover:bg-gray-50 transition-colors text-base sm:text-sm
        ${isSelected ? 'bg-meridian-50' : 'bg-white'}
      `}
      style={{ paddingLeft: indentPx, paddingRight: 'var(--board-px)' }}
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
        <Icon className={`shrink-0 w-6 h-6 sm:w-5 sm:h-5 ${TYPE_COLOR[item.type]}`} />
      )}

      {/* Title */}
      <span
        className={`flex-1 truncate ${
          status?.isComplete ? 'line-through text-gray-400' : 'text-gray-800'
        }`}
      >
        {item.title}
      </span>

      {/* Parent context */}
      {parentItem && (
        <span className="hidden md:block shrink-0 text-2xs text-gray-400 truncate max-w-[160px]">
          {parentItem.title}
        </span>
      )}

      {/* Sprint tag */}
      {sprint && (
        <span className="hidden sm:inline-flex shrink-0 text-2xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
          {sprint.name}
        </span>
      )}

      {/* Assignee avatar */}
      <Avatar user={user} size={24} className="shrink-0 sm:w-5 sm:h-5" />

      {/* Status indicator */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0 p-2 -m-2 sm:p-0 sm:m-0">
        <StatusDot status={status} onClick={() => onStatusCycle(item.id)} />
      </div>

      {/* Add child button — visible on hover for non-relay items */}
      {CAN_ADD_CHILD[item.type] && onAddChild && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddChild(item) }}
          title={`Add ${item.type === 'arc' ? 'Episode' : item.type === 'episode' ? 'Signal' : 'Relay'}`}
          className="shrink-0 p-1 rounded text-gray-400 hover:text-meridian-600 hover:bg-meridian-50 opacity-100 sm:opacity-40 sm:group-hover:opacity-100 transition-all"
        >
          <Plus size={17} />
        </button>
      )}
    </div>
  )
}

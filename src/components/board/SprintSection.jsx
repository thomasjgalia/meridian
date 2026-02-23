import { useState } from 'react'
import { ChevronRight, Pencil, Plus } from 'lucide-react'
import { TYPE_ICONS } from '../icons'
import { StatusDot } from '../ui/StatusChip'
import Avatar from '../ui/Avatar'
import SprintEditModal from './SprintEditModal'

// Types that can have children added inline
const CAN_ADD_CHILD = { arc: true, episode: true, signal: true }

const TYPE_COLOR = {
  arc:     'text-violet-500',
  episode: 'text-indigo-600',
  signal:  'text-teal-500',
  relay:   'text-orange-500',
}

const STATE_BADGE = {
  active:   'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  planning: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  complete: 'bg-gray-100 text-gray-500',
}

const STATE_CYCLE = { planning: 'active', active: 'complete', complete: 'planning' }

const INDENT      = 20
const BASE_INDENT = 12

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Build a flat ordered row list from sprint items.
 * Items whose parent is also in the sprint become children.
 */
function buildSprintTree(sprintItems, collapsedIds) {
  const ids = new Set(sprintItems.map((i) => i.id))
  const childrenOf = {}

  sprintItems.forEach((item) => {
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : 'root'
    if (!childrenOf[key]) childrenOf[key] = []
    childrenOf[key].push(item)
  })
  Object.values(childrenOf).forEach((arr) => arr.sort((a, b) => a.position - b.position))

  const rows = []
  function dfs(children, depth) {
    for (const item of children) {
      const kids = childrenOf[item.id] ?? []
      rows.push({ ...item, depth, hasChildren: kids.length > 0 })
      if (kids.length > 0 && !collapsedIds.has(item.id)) {
        dfs(kids, depth + 1)
      }
    }
  }
  dfs(childrenOf['root'] ?? [], 0)
  return rows
}

function SprintItemRow({
  row,
  isSelected,
  isExpanded,
  parentName,
  onSelect,
  onToggle,
  onStatusCycle,
  onAddChild,
  statusMap,
  userMap,
}) {
  const Icon   = TYPE_ICONS[row.type]
  const status = statusMap[row.statusId]
  const user   = userMap[row.assigneeId]

  return (
    <div
      onClick={() => onSelect(row.id)}
      className={`
        group flex items-center gap-2 row-height border-b border-gray-100 cursor-pointer
        hover:bg-gray-50 transition-colors text-sm
        ${isSelected ? 'bg-meridian-50' : 'bg-white'}
      `}
      style={{ paddingLeft: BASE_INDENT + row.depth * INDENT, paddingRight: 12 }}
    >
      {/* Expand / collapse toggle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(row.id) }}
        className={`
          flex items-center justify-center w-4 h-4 shrink-0 rounded
          text-gray-400 hover:text-gray-600 transition-colors
          ${!row.hasChildren ? 'invisible' : ''}
        `}
      >
        <ChevronRight
          size={13}
          className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {Icon && <Icon size={16} className={`shrink-0 ${TYPE_COLOR[row.type]}`} />}

      <span className={`flex-1 truncate min-w-0 ${status?.isComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>
        {row.title}
      </span>

      {parentName && (
        <span className="hidden md:block shrink-0 text-2xs text-gray-400 truncate max-w-[160px]">
          {parentName}
        </span>
      )}

      <Avatar user={user} size={18} className="shrink-0" />

      {/* Status indicator */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <StatusDot status={status} onClick={() => onStatusCycle(row.id)} />
      </div>

      {/* Add child button — visible on hover for non-relay items */}
      {CAN_ADD_CHILD[row.type] && onAddChild && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddChild(row) }}
          title={`Add ${row.type === 'arc' ? 'Episode' : row.type === 'episode' ? 'Signal' : 'Relay'}`}
          className="shrink-0 p-1 rounded text-gray-400 hover:text-meridian-600 hover:bg-meridian-50 opacity-40 group-hover:opacity-100 transition-all"
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  )
}

export default function SprintSection({
  sprint,
  items,
  selectedId,
  onSelect,
  onStatusCycle,
  onUpdate,
  onDelete,
  onAddChild,
  statusMap,
  userMap,
  allItemMap,
  defaultCollapsed = false,
}) {
  const [collapsed,    setCollapsed]    = useState(defaultCollapsed)
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const [editOpen,     setEditOpen]     = useState(false)

  const handleToggle = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCycleState = (e) => {
    e.stopPropagation()
    const next = STATE_CYCLE[sprint.state]
    onUpdate?.(sprint.id, 'state', next)
  }

  const rows           = buildSprintTree(items, collapsedIds)
  const completedCount = items.filter((i) => statusMap[i.statusId]?.isComplete).length
  const progress       = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0
  const dateStr        = sprint.startDate && sprint.endDate
    ? `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`
    : null

  return (
    <div>
      {/* ── Section header ── */}
      <div
        className="group/header flex items-center gap-3 px-4 h-9 bg-gray-50 border-y border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none sticky top-0 z-10"
        onClick={() => setCollapsed((c) => !c)}
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-gray-400 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
        />
        <span className="font-semibold text-sm text-gray-800">{sprint.name}</span>

        {/* State badge — click cycles state */}
        <button
          type="button"
          onClick={handleCycleState}
          title="Click to change state"
          className={`text-2xs font-medium px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-70 ${STATE_BADGE[sprint.state]}`}
        >
          {sprint.state.charAt(0).toUpperCase() + sprint.state.slice(1)}
        </button>

        {dateStr && (
          <span className="text-xs text-gray-400 hidden sm:block">{dateStr}</span>
        )}

        <div className="flex-1" />

        <span className="text-xs text-gray-400 shrink-0">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>

        {/* Progress bar */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-7 text-right">{progress}%</span>
        </div>

        {/* Edit button */}
        {onUpdate && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditOpen(true) }}
            title="Edit sprint"
            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-colors opacity-0 group-hover/header:opacity-100"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* ── Sprint items ── */}
      {!collapsed && (
        rows.length > 0
          ? rows.map((row) => (
              <SprintItemRow
                key={row.id}
                row={row}
                isSelected={row.id === selectedId}
                isExpanded={!collapsedIds.has(row.id)}
                parentName={row.parentId ? allItemMap[row.parentId]?.title : null}
                onSelect={onSelect}
                onToggle={handleToggle}
                onStatusCycle={onStatusCycle}
                onAddChild={onAddChild}
                statusMap={statusMap}
                userMap={userMap}
              />
            ))
          : (
            <div className="px-12 py-3 text-sm text-gray-400 italic bg-white border-b border-gray-100">
              No items assigned to this sprint yet.
            </div>
          )
      )}

      {/* Sprint edit modal */}
      {editOpen && (
        <SprintEditModal
          sprint={sprint}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}

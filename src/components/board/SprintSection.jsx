import { useState } from 'react'
import { ChevronRight, Pencil, Plus, CalendarDays } from 'lucide-react'
import { TYPE_ICONS, IconEpisode, IconSignal, IconRelay } from '../icons'
import { StatusDot } from '../ui/StatusChip'
import Avatar from '../ui/Avatar'
import SprintEditModal from './SprintEditModal'

// Types that can have children added inline
const CAN_ADD_CHILD = { arc: true, episode: true, signal: true }

const TYPE_COLOR = {
  arc:     'text-violet-600',
  episode: 'text-indigo-600',
  signal:  'text-rose-600',
  relay:   'text-orange-500',
}

const STATE_BADGE = {
  active:   'bg-meridian-50 text-meridian-700 ring-1 ring-meridian-200',
  planning: 'bg-meridian-50 text-meridian-400 ring-1 ring-meridian-200',
  complete: 'bg-gray-100 text-gray-500',
}

const STATE_CYCLE = { planning: 'active', active: 'complete', complete: 'planning' }

const DEPTH_ORDER = { episode: 0, signal: 1, relay: 2 }

const TYPE_ORDER = { arc: 0, episode: 1, signal: 2, relay: 3 }

function compareItems(a, b) {
  const tDiff = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
  if (tDiff !== 0) return tDiff
  // Group siblings that share the same parent arc together
  if ((a.parentId ?? 0) !== (b.parentId ?? 0)) return (a.parentId ?? 0) - (b.parentId ?? 0)
  const da = a.dueDate ?? a.createdAt ?? '9999-99-99'
  const db = b.dueDate ?? b.createdAt ?? '9999-99-99'
  return da < db ? -1 : da > db ? 1 : 0
}

const INDENT = 14

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDue(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
  Object.values(childrenOf).forEach((arr) => arr.sort(compareItems))

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
  onUpdate,
  statusMap,
  userMap,
}) {
  const Icon   = TYPE_ICONS[row.type]
  const status = statusMap[row.statusId]
  const user   = userMap[row.assigneeId]

  const [editingDue, setEditingDue] = useState(false)

  const rowBg = isSelected
    ? '#f0fdfa'
    : status?.isBlocked
      ? status.color + '14'
      : undefined

  return (
    <div
      onClick={() => onSelect(row.id)}
      className="group flex items-center gap-2.5 sm:gap-2 row-height sm:border-b sm:border-gray-100 mx-3 mb-1 sm:mx-0 sm:mb-0 bg-white sm:bg-transparent rounded-xl sm:rounded-none shadow-sm sm:shadow-none cursor-pointer hover:brightness-95 transition-all text-base sm:text-sm"
      style={{ paddingLeft: `calc(var(--board-px) + ${row.depth * INDENT}px)`, paddingRight: 'var(--board-px)', backgroundColor: rowBg }}
    >
      {/* Expand / collapse toggle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(row.id) }}
        className={`
          flex items-center justify-center w-5 h-5 sm:w-4 sm:h-4 shrink-0 rounded
          text-gray-400 hover:text-gray-600 transition-colors
          ${!row.hasChildren ? 'invisible' : ''}
        `}
      >
        <ChevronRight
          size={15}
          className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {Icon && <Icon size={20} className={`shrink-0 ${TYPE_COLOR[row.type]}`} />}

      {/* Title + parent context + add-child */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={`truncate ${status?.isComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>{row.title}</span>
        {parentName && (
          <span className="hidden md:block shrink-0 text-2xs text-gray-400 truncate max-w-[160px]">
            {parentName}
          </span>
        )}
        {CAN_ADD_CHILD[row.type] && onAddChild && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddChild(row) }}
            title={`Add ${row.type === 'arc' ? 'Episode' : row.type === 'episode' ? 'Signal' : 'Relay'}`}
            className="shrink-0 p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Due date — inline editable */}
      {(row.dueDate || onUpdate) && (
        <div className="hidden sm:flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          {editingDue ? (
            <input
              type="date"
              autoFocus
              defaultValue={row.dueDate ? row.dueDate.slice(0, 10) : ''}
              onChange={(e) => { onUpdate(row.id, 'dueDate', e.target.value || null); setEditingDue(false) }}
              onBlur={() => setEditingDue(false)}
              className="h-6 text-2xs px-1.5 border border-meridian-300 rounded focus:outline-none focus:ring-1 focus:ring-meridian-400 bg-white"
            />
          ) : row.dueDate ? (
            <span
              onClick={onUpdate ? () => setEditingDue(true) : undefined}
              className={`inline-flex items-center text-2xs font-medium px-1.5 py-0.5 rounded ${onUpdate ? 'cursor-pointer' : ''} ${
                row.dueDate.slice(0, 10) < new Date().toLocaleDateString('en-CA') && !status?.isComplete ? 'bg-red-50 text-red-500 ring-1 ring-red-200' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {formatDue(row.dueDate)}
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

      <Avatar user={user} size={24} className="shrink-0 sm:w-5 sm:h-5 opacity-50" />

      {/* Status indicator */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0 p-2 -m-2 sm:p-0 sm:m-0">
        <StatusDot status={status} onClick={() => onStatusCycle(row.id)} />
      </div>
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
  onItemUpdate,
  onDelete,
  onAddChild,
  statusMap,
  userMap,
  allItemMap,
  defaultCollapsed = false,
  overdueOnly = false,
}) {
  const [collapsed,    setCollapsed]    = useState(defaultCollapsed)
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const [editOpen,     setEditOpen]     = useState(false)
  const [depth,        setDepth]        = useState('episode')

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
        className="group/header flex items-center gap-3 board-px h-9 sm:h-9 bg-gray-100/90 sm:bg-gray-50 backdrop-blur-sm sm:backdrop-blur-none border-y border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none sticky top-0 z-10"
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

        {/* Depth selector */}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {[
            { type: 'episode', Icon: IconEpisode, color: 'text-indigo-600' },
            { type: 'signal',  Icon: IconSignal,  color: 'text-rose-600'   },
            { type: 'relay',   Icon: IconRelay,   color: 'text-orange-500' },
          ].map(({ type, Icon, color }) => (
            <button key={type} type="button"
              onClick={() => setDepth(type)}
              title={`Show to ${type} level`}
              className={`p-0.5 rounded transition-colors ${
                DEPTH_ORDER[type] <= DEPTH_ORDER[depth] ? color : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 shrink-0">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>

        {/* Progress bar */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-meridian-500 rounded-full transition-all duration-300"
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
            <Pencil size={15} />
          </button>
        )}
      </div>

      {/* ── Sprint items ── */}
      {!collapsed && (
        rows.length > 0
          ? rows
              .filter((r) => overdueOnly || DEPTH_ORDER[r.type] <= DEPTH_ORDER[depth])
              .map((row) => {
                const clipped = !overdueOnly && DEPTH_ORDER[row.type] === DEPTH_ORDER[depth]
                  ? { ...row, hasChildren: false }
                  : row
                return (
                  <SprintItemRow
                    key={clipped.id}
                    row={clipped}
                    isSelected={clipped.id === selectedId}
                    isExpanded={!collapsedIds.has(clipped.id)}
                    parentName={clipped.parentId ? allItemMap[clipped.parentId]?.title : null}
                    onSelect={onSelect}
                    onToggle={handleToggle}
                    onStatusCycle={onStatusCycle}
                    onAddChild={onAddChild}
                    onUpdate={onItemUpdate}
                    statusMap={statusMap}
                    userMap={userMap}
                  />
                )
              })
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

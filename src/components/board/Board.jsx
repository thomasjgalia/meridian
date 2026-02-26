import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, ChevronRight, Settings, Download, Pencil, LogOut } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../api/client'
import { IconSextant, IconArc, IconEpisode, IconSignal, IconRelay } from '../icons'
import Avatar from '../ui/Avatar'
import FilterBar from './FilterBar'
import WorkItemRow from './WorkItemRow'
import SprintSection from './SprintSection'
import SlidePanel from './SlidePanel'
import NewWorkModal from './NewWorkModal'
import NewMeridianModal from './NewMeridianModal'
import NewArcModal from './NewArcModal'
import NewSprintModal from './NewSprintModal'
import MeridianSettingsModal from './MeridianSettingsModal'
import InviteAcceptBanner from './InviteAcceptBanner'

// ── Lookup maps ───────────────────────────────────────────────────────────────

function toMap(arr, key = 'id') {
  return Object.fromEntries(arr.map((x) => [x[key], x]))
}

// ── Header hierarchy legend ───────────────────────────────────────────────────

const HIERARCHY = [
  { Icon: IconArc,     label: 'Arc',     color: 'text-violet-600' },
  { Icon: IconEpisode, label: 'Episode', color: 'text-indigo-600' },
  { Icon: IconSignal,  label: 'Signal',  color: 'text-rose-600'   },
  { Icon: IconRelay,   label: 'Relay',   color: 'text-orange-500' },
]

const DEPTH_ORDER = { episode: 0, signal: 1, relay: 2 }
const DEPTH_ICONS = [
  { type: 'episode', Icon: IconEpisode, color: 'text-indigo-600' },
  { type: 'signal',  Icon: IconSignal,  color: 'text-rose-600'   },
  { type: 'relay',   Icon: IconRelay,   color: 'text-orange-500' },
]

// ── Arc section header ────────────────────────────────────────────────────────

function ArcHeader({ arc, isExpanded, isSelected, onToggle, onSelect, onAddChild }) {
  return (
    <div
      className={`
        group/archdr flex items-center gap-2 board-px h-8 border-b border-violet-100 cursor-pointer
        transition-colors select-none
        ${isSelected ? 'bg-violet-100' : 'bg-violet-50/50 hover:bg-violet-50'}
      `}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(arc.id) }}
        className="flex items-center justify-center w-4 h-4 shrink-0 text-violet-400 hover:text-violet-600 transition-colors"
      >
        <ChevronRight
          size={15}
          className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      <IconArc size={18} className="text-violet-400 shrink-0" />

      <button
        type="button"
        onClick={() => onSelect(arc.id)}
        className="flex-1 text-left text-xs font-semibold text-violet-700 truncate hover:text-violet-900 transition-colors"
      >
        {arc.title}
      </button>

      {onAddChild && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddChild(arc) }}
          title="Add Episode"
          className="shrink-0 p-1 rounded text-violet-400 hover:text-violet-700 hover:bg-violet-100 opacity-0 group-hover/archdr:opacity-100 transition-all"
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  )
}

// ── Backlog tree utilities ────────────────────────────────────────────────────

function findAncestorId(item, type, itemMap) {
  if (item.type === type) return item.id
  let cur = item.parentId ? itemMap[item.parentId] : null
  while (cur) {
    if (cur.type === type) return cur.id
    cur = cur.parentId ? itemMap[cur.parentId] : null
  }
  return null
}

function matchesFilters(item, filters, itemMap) {
  if (filters.meridianIds.length > 0 && !filters.meridianIds.includes(item.meridianId)) return false
  if (filters.arcIds.length      > 0 && !filters.arcIds.includes(findAncestorId(item, 'arc', itemMap)))     return false
  if (filters.episodeIds.length  > 0 && !filters.episodeIds.includes(findAncestorId(item, 'episode', itemMap))) return false
  if (filters.assigneeIds.length > 0 && !filters.assigneeIds.includes(item.assigneeId)) return false
  if (filters.statusIds.length   > 0 && !filters.statusIds.includes(item.statusId))     return false
  return true
}

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

function buildBacklogRows(items, itemMap, expandedIds, filters) {
  const hasFilters =
    filters.meridianIds.length > 0 ||
    filters.arcIds.length      > 0 ||
    filters.episodeIds.length  > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.statusIds.length   > 0

  const inSet = new Set(items.map((i) => i.id))
  const childrenOf = {}
  items.forEach((item) => {
    const key = (item.parentId && inSet.has(item.parentId)) ? item.parentId : 'root'
    if (!childrenOf[key]) childrenOf[key] = []
    childrenOf[key].push(item)
  })
  Object.values(childrenOf).forEach((arr) => arr.sort(compareItems))

  if (hasFilters) {
    const matchingIds = new Set(items.filter((i) => matchesFilters(i, filters, itemMap)).map((i) => i.id))
    const visibleIds  = new Set(matchingIds)
    matchingIds.forEach((id) => {
      let cur = itemMap[id]
      while (cur?.parentId) {
        visibleIds.add(cur.parentId)
        cur = itemMap[cur.parentId]
      }
    })

    const rows = []
    function dfsFiltered(children, depth) {
      for (const item of children) {
        if (!visibleIds.has(item.id)) continue
        const kids           = childrenOf[item.id] ?? []
        const hasVisibleKids = kids.some((k) => visibleIds.has(k.id))
        rows.push({ ...item, depth, hasChildren: kids.length > 0 })
        if (hasVisibleKids) dfsFiltered(kids, depth + 1)
      }
    }
    dfsFiltered(childrenOf['root'] ?? [], 0)
    return rows
  }

  const rows = []
  function dfs(children, depth) {
    for (const item of children) {
      const kids = childrenOf[item.id] ?? []
      rows.push({ ...item, depth, hasChildren: kids.length > 0 })
      if (expandedIds.has(item.id) && kids.length > 0) dfs(kids, depth + 1)
    }
  }
  dfs(childrenOf['root'] ?? [], 0)
  return rows
}

// ── User menu (avatar → rename / sign out) ────────────────────────────────────

function UserMenu({ displayName, email, userId, userMap, logout, onRename }) {
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setEditing(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Use the DB name if available (reflects any previous rename)
  const liveDisplayName = userMap[userId]?.displayName ?? displayName

  async function handleSave() {
    const name = draft.trim()
    if (!name || name === liveDisplayName) { setEditing(false); return }
    setSaving(true)
    try {
      await api.patch('/api/users/me', { displayName: name })
      onRename(name)
      setEditing(false)
      setOpen(false)
    } catch { /* silent — name stays unchanged */ }
    finally { setSaving(false) }
  }

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={liveDisplayName}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-meridian-400"
      >
        <Avatar user={{ displayName: liveDisplayName }} size={28} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2">

          {/* Name + edit */}
          <div className="px-3 pb-2.5 border-b border-gray-100">
            {editing ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  handleSave()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  className="flex-1 text-sm px-2 py-0.5 border border-meridian-400 rounded outline-none focus:ring-2 focus:ring-meridian-300"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs font-medium text-meridian-600 hover:text-meridian-800 disabled:opacity-40"
                >
                  {saving ? '…' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group/name mt-0.5">
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                  {liveDisplayName}
                </span>
                <button
                  type="button"
                  onClick={() => { setDraft(liveDisplayName); setEditing(true) }}
                  title="Edit display name"
                  className="p-0.5 rounded text-gray-300 hover:text-gray-600 opacity-0 group-hover/name:opacity-100 transition-opacity"
                >
                  <Pencil size={11} />
                </button>
              </div>
            )}
            {email && <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>}
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors mt-0.5"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

const INITIAL_FILTERS = { meridianIds: [], arcIds: [], episodeIds: [], assigneeIds: [], statusIds: [], sprintId: null }

// Child type produced when clicking "+" on a parent row
const ADD_CHILD_TYPE = { arc: 'episode', episode: 'signal', signal: 'relay' }

export default function Board() {
  const { user, logout } = useAuth()

  // ── Server state ──────────────────────────────────────────────────────────
  const [items,     setItems]     = useState([])
  const [meridians, setMeridians] = useState([])
  const [statuses,  setStatuses]  = useState([])
  const [users,     setUsers]     = useState([])
  const [sprints,   setSprints]   = useState([])
  const [myRoles,   setMyRoles]   = useState({}) // { [meridianId]: 'owner' | 'member' | 'viewer' }
  const [myUserId,  setMyUserId]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [expanded,          setExpanded]          = useState(new Set())
  const [backlogCollapsed,  setBacklogCollapsed]  = useState(false)
  const [backlogDepth,      setBacklogDepth]      = useState('episode')
  const [selectedId,        setSelectedId]        = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('item')
    return p ? parseInt(p, 10) : null
  })
  const [filters,           setFilters]           = useState(INITIAL_FILTERS)
  const [overdueOnly,       setOverdueOnly]       = useState(false)
  const [activeMeridianId,  setActiveMeridianId]  = useState(null)
  const [newWorkOpen,       setNewWorkOpen]       = useState(false)
  const [newWorkContext,    setNewWorkContext]     = useState(null) // { type, arcId?, episodeId?, signalId? }
  const [newMeridianOpen,   setNewMeridianOpen]   = useState(false)
  const [newSprintOpen,     setNewSprintOpen]     = useState(false)
  const [meridianMenuOpen,  setMeridianMenuOpen]  = useState(false)
  const [newArcMeridianId,  setNewArcMeridianId]  = useState(null)
  const [settingsMeridian,  setSettingsMeridian]  = useState(null)  // meridian object for settings modal
  const [inviteToken,       setInviteToken]       = useState(
    () => new URLSearchParams(window.location.search).get('invite')
  )

  const meridianMenuRef = useRef(null)

  // ── Load board data ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/api/board')
      .then((data) => {
        setMeridians(data.meridians)
        setStatuses(data.statuses)
        setSprints(data.sprints)
        setUsers(data.users)
        setItems(data.items)
        setMyRoles(data.myRoles ?? {})
        setMyUserId(data.myUserId ?? null)
        // Start with all arcs expanded — arcs are backlog section headers
        setExpanded(new Set(data.items.filter((i) => i.type === 'arc').map((i) => i.id)))
        // Default to first meridian
        setActiveMeridianId((prev) => prev ?? data.meridians[0]?.id ?? null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Close meridian menu on outside click
  useEffect(() => {
    function handler(e) {
      if (meridianMenuRef.current && !meridianMenuRef.current.contains(e.target)) {
        setMeridianMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Derived maps ──────────────────────────────────────────────────────────
  const itemMap     = useMemo(() => toMap(items),     [items])
  const meridianMap = useMemo(() => toMap(meridians), [meridians])
  const statusMap   = useMemo(() => toMap(statuses),  [statuses])
  const userMap     = useMemo(() => toMap(users),     [users])
  const sprintMap   = useMemo(() => toMap(sprints),   [sprints])

  const activeMeridian = activeMeridianId ? meridianMap[activeMeridianId] ?? null : null

  // Role of the current user in the active meridian
  const activeRole    = activeMeridianId ? (myRoles[activeMeridianId] ?? null) : null
  const userCanWrite  = activeRole === 'owner' || activeRole === 'member'
  const userCanManage = activeRole === 'owner'

  const sortedSprints = useMemo(() =>
    [...sprints].sort((a, b) => {
      const order = { active: 0, planning: 1, complete: 2 }
      return order[a.state] - order[b.state]
    }),
    [sprints]
  )

  // Arcs grouped by meridian, for the Meridian dropdown
  const arcsByMeridian = useMemo(() => {
    const map = {}
    items.filter((i) => i.type === 'arc').forEach((arc) => {
      if (!map[arc.meridianId]) map[arc.meridianId] = []
      map[arc.meridianId].push(arc)
    })
    return map
  }, [items])

  // Episode count per Arc, for display in the dropdown
  const episodeCountByArc = useMemo(() => {
    const map = {}
    items.filter((i) => i.type === 'episode').forEach((ep) => {
      if (ep.parentId) map[ep.parentId] = (map[ep.parentId] || 0) + 1
    })
    return map
  }, [items])

  // Arc and Episode lists for the filter bar — scoped to active meridian
  const filterArcs = useMemo(() =>
    items
      .filter((i) => i.type === 'arc' && (!activeMeridianId || i.meridianId === activeMeridianId))
      .map((i) => ({ id: i.id, name: i.title, parentId: i.parentId })),
    [items, activeMeridianId]
  )

  const allFilterEpisodes = useMemo(() =>
    items
      .filter((i) => i.type === 'episode' && (!activeMeridianId || i.meridianId === activeMeridianId))
      .map((i) => ({ id: i.id, name: i.title, parentId: i.parentId })),
    [items, activeMeridianId]
  )

  const filterEpisodes = useMemo(() =>
    filters.arcIds.length > 0
      ? allFilterEpisodes.filter((ep) => filters.arcIds.includes(ep.parentId))
      : allFilterEpisodes,
    [allFilterEpisodes, filters.arcIds]
  )

  // Statuses scoped to active meridian for the filter bar
  const filterStatuses = useMemo(() =>
    statuses.filter((s) => !activeMeridianId || s.meridianId === activeMeridianId),
    [statuses, activeMeridianId]
  )

  // ── Sprint groups — scoped to active meridian ──────────────────────────────
  // Arcs are never sprint items — they're containers that span many sprints.
  const sprintGroups = useMemo(() =>
    sortedSprints
      .filter((s) => !activeMeridianId || s.meridianId === activeMeridianId)
      .map((sprint) => ({
        sprint,
        items: items
          .filter((i) => {
            if (i.sprintId !== sprint.id || i.type === 'arc') return false
            if (!matchesFilters(i, filters, itemMap)) return false
            if (overdueOnly) {
              const today = new Date().toLocaleDateString('en-CA')
              if (!i.dueDate || i.dueDate.slice(0, 10) > today) return false
              if (statusMap[i.statusId]?.isComplete) return false
            }
            return true
          })
          .sort(compareItems),
      }))
      .filter((g) => filters.sprintId === null || filters.sprintId === g.sprint.id),
    [items, filters, itemMap, sortedSprints, activeMeridianId, overdueOnly, statusMap]
  )

  // ── Backlog rows — scoped to active meridian ────────────────────────────────
  // Arcs always live in the backlog regardless of their sprintId.
  const backlogRows = useMemo(() => {
    if (filters.sprintId !== null) return []
    let backlogItems = items.filter((i) =>
      (i.sprintId === null || i.type === 'arc') && (!activeMeridianId || i.meridianId === activeMeridianId)
    )
    if (overdueOnly) {
      const today = new Date().toLocaleDateString('en-CA')
      backlogItems = backlogItems.filter((i) =>
        i.dueDate && i.dueDate.slice(0, 10) <= today && !statusMap[i.statusId]?.isComplete
      )
    }
    return buildBacklogRows(backlogItems, itemMap, expanded, filters)
  }, [items, itemMap, expanded, filters, activeMeridianId, overdueOnly, statusMap])

  // ── Slide panel data ───────────────────────────────────────────────────────
  const selectedItem = selectedId ? itemMap[selectedId] : null
  const childItems   = selectedItem
    ? items.filter((i) => i.parentId === selectedItem.id).sort(compareItems)
    : []

  // ── Item handlers ──────────────────────────────────────────────────────────

  const handleToggle = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleSelect = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  // Returns today's date string (YYYY-MM-DD) if the given status should auto-set start_date
  function autoStartDate(item, newStatus) {
    if (!newStatus || newStatus.isDefault || newStatus.isComplete) return null
    if (item.startDate) return null
    return new Date().toISOString().split('T')[0]
  }

  const handleStatusCycle = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const meridianStatuses = statuses
          .filter((s) => s.meridianId === item.meridianId)
          .sort((a, b) => a.position - b.position)
        if (!meridianStatuses.length) return item
        const idx        = meridianStatuses.findIndex((s) => s.id === item.statusId)
        const nextStatus = meridianStatuses[(idx + 1) % meridianStatuses.length]
        const sd         = autoStartDate(item, nextStatus)
        api.patch(`/api/items/${id}`, { field: 'statusId', value: nextStatus.id }).catch(console.error)
        return { ...item, statusId: nextStatus.id, ...(sd ? { startDate: sd } : {}) }
      })
    )
  }, [statuses])

  const handleUpdateItem = useCallback((id, field, value) => {
    setItems((prev) => {
      function descendants(rootId) {
        const result = new Set()
        const queue = [rootId]
        while (queue.length) {
          const cur = queue.pop()
          prev.forEach((i) => {
            if (i.parentId === cur) { result.add(i.id); queue.push(i.id) }
          })
        }
        return result
      }

      if (field === 'parentId') {
        const map = toMap(prev)
        let newMeridianId = map[id]?.meridianId ?? null
        let cur = value ? map[value] : null
        while (cur) {
          if (cur.type === 'arc') { newMeridianId = cur.meridianId; break }
          cur = cur.parentId ? map[cur.parentId] : null
        }
        const desc = descendants(id)
        return prev.map((item) => {
          if (item.id === id)     return { ...item, parentId: value, meridianId: newMeridianId }
          if (desc.has(item.id)) return { ...item, meridianId: newMeridianId }
          return item
        })
      }

      if (field === 'meridianId') {
        const desc = descendants(id)
        return prev.map((item) => {
          if (item.id === id)     return { ...item, meridianId: value }
          if (desc.has(item.id)) return { ...item, meridianId: value }
          return item
        })
      }

      return prev.map((item) => {
        if (item.id !== id) return item
        const updates = { [field]: value }
        if (field === 'statusId') {
          const newStatus = statuses.find((s) => s.id === value)
          const sd = autoStartDate(item, newStatus)
          if (sd) updates.startDate = sd
        }
        return { ...item, ...updates }
      })
    })

    api.patch(`/api/items/${id}`, { field, value }).catch(console.error)
  }, [statuses])

  const handleDeleteItem = useCallback((id) => {
    setItems((prev) => {
      const toRemove = new Set([id])
      const queue = [id]
      while (queue.length) {
        const cur = queue.pop()
        prev.forEach((i) => {
          if (i.parentId === cur) { toRemove.add(i.id); queue.push(i.id) }
        })
      }
      return prev.filter((i) => !toRemove.has(i.id))
    })
    setSelectedId(null)
    api.delete(`/api/items/${id}`).catch(console.error)
  }, [])

  const handleAddItem = useCallback(async (partialItem) => {
    const tempId = -(Date.now())
    const tempItem = { ...partialItem, id: tempId }
    setItems((prev) => [...prev, tempItem])
    if (partialItem.parentId) {
      setExpanded((prev) => { const n = new Set(prev); n.add(partialItem.parentId); return n })
    }
    try {
      const created = await api.post('/api/items', partialItem)
      setItems((prev) => prev.map((i) => i.id === tempId ? created : i))
      setSelectedId((prev) => prev === tempId ? created.id : prev)
    } catch (err) {
      console.error('Failed to create item:', err)
      setItems((prev) => prev.filter((i) => i.id !== tempId))
    }
  }, [])

  // Open NewWorkModal pre-populated for a child item of the given parent row
  const handleAddChild = useCallback((parentItem) => {
    const childType = ADD_CHILD_TYPE[parentItem.type]
    if (!childType) return

    const ctx = { type: childType }
    // Walk up the tree to set arc/episode/signal context IDs
    let cur = parentItem
    while (cur) {
      if (cur.type === 'arc')     ctx.arcId     = cur.id
      if (cur.type === 'episode') ctx.episodeId  = cur.id
      if (cur.type === 'signal')  ctx.signalId   = cur.id
      cur = cur.parentId ? itemMap[cur.parentId] : null
    }
    setNewWorkContext(ctx)
    setNewWorkOpen(true)
  }, [itemMap])

  // ── User rename ───────────────────────────────────────────────────────────

  const handleRename = useCallback((newName) => {
    setUsers((prev) => prev.map((u) => u.id === myUserId ? { ...u, displayName: newName } : u))
  }, [myUserId])

  // ── Meridian handlers ──────────────────────────────────────────────────────

  const handleAddMeridian = useCallback(async ({ name, slug, color }) => {
    try {
      await api.post('/api/meridians', { name, slug, color })
      const data = await api.get('/api/board')
      setMeridians(data.meridians)
      setStatuses(data.statuses)
      setSprints(data.sprints)
      setUsers(data.users)
      setItems(data.items)
      setMyRoles(data.myRoles ?? {})
      setMyUserId(data.myUserId ?? null)
      // Auto-select the new meridian if none is active
      setActiveMeridianId((prev) => prev ?? data.meridians[0]?.id ?? null)
    } catch (err) {
      console.error('Failed to create meridian:', err)
      throw err
    }
  }, [])

  // ── Sprint handlers ────────────────────────────────────────────────────────

  const handleAddSprint = useCallback(async (body) => {
    const created = await api.post('/api/sprints', body)
    setSprints((prev) => [...prev, created])
  }, [])

  const handleUpdateSprint = useCallback((id, field, value) => {
    setSprints((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
    api.patch(`/api/sprints/${id}`, { field, value }).catch(console.error)
  }, [])

  const handleDeleteSprint = useCallback(async (id) => {
    await api.delete(`/api/sprints/${id}`)
    setSprints((prev) => prev.filter((s) => s.id !== id))
    // Unassign items locally
    setItems((prev) => prev.map((i) => i.sprintId === id ? { ...i, sprintId: null } : i))
  }, [])

  // ── Export board to text ──────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const TYPE_LABEL = { arc: 'ARC', episode: 'EP ', signal: 'SIG', relay: 'REL' }
    const SEP  = '─'.repeat(56)
    const HSEP = '═'.repeat(56)

    function fmtItem(item, depth) {
      const indent    = '  '.repeat(depth)
      const typeLabel = TYPE_LABEL[item.type] ?? item.type.toUpperCase()
      const status    = statusMap[item.statusId]
      const user      = userMap[item.assigneeId]
      const parts     = [`${indent}[${typeLabel}] ${item.title}`]
      if (status) parts.push(`[${status.name}]`)
      if (user)   parts.push(user.displayName)
      return parts.join('  ')
    }

    function renderTree(flatItems, lines) {
      const ids        = new Set(flatItems.map((i) => i.id))
      const childrenOf = {}
      flatItems.forEach((item) => {
        const key = item.parentId && ids.has(item.parentId) ? item.parentId : 'root'
        if (!childrenOf[key]) childrenOf[key] = []
        childrenOf[key].push(item)
      })
      Object.values(childrenOf).forEach((arr) => arr.sort(compareItems))
      function dfs(children, depth) {
        for (const item of children) {
          lines.push(fmtItem(item, depth))
          dfs(childrenOf[item.id] ?? [], depth + 1)
        }
      }
      dfs(childrenOf['root'] ?? [], 0)
    }

    const date  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const lines = [HSEP, `MERIDIAN: ${activeMeridian?.name ?? 'All'}`, `Exported:  ${date}`, HSEP]

    for (const { sprint, items: sItems } of sprintGroups) {
      const done      = sItems.filter((i) => statusMap[i.statusId]?.isComplete).length
      const dateRange = sprint.startDate && sprint.endDate
        ? ` · ${new Date(sprint.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(sprint.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : ''
      lines.push('', `SPRINT: ${sprint.name} [${sprint.state.toUpperCase()}]${dateRange} · ${done}/${sItems.length} done`, SEP)
      renderTree(sItems, lines)
    }

    if (backlogRows.length > 0) {
      lines.push('', `BACKLOG · ${backlogRows.length} item${backlogRows.length !== 1 ? 's' : ''}`, SEP)
      for (const row of backlogRows) lines.push(fmtItem(row, row.depth))
    }

    const blob     = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url      = URL.createObjectURL(blob)
    const anchor   = document.createElement('a')
    anchor.href     = url
    anchor.download = `meridian-${activeMeridian?.slug ?? 'all'}-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [activeMeridian, sprintGroups, backlogRows, statusMap, userMap])

  // ── Board reload helper (used after invite accept / member leave) ─────────
  const reloadBoard = useCallback(async () => {
    try {
      const data = await api.get('/api/board')
      setMeridians(data.meridians)
      setStatuses(data.statuses)
      setSprints(data.sprints)
      setUsers(data.users)
      setItems(data.items)
      setMyRoles(data.myRoles ?? {})
      setMyUserId(data.myUserId ?? null)
      setActiveMeridianId((prev) => data.meridians.some((m) => m.id === prev) ? prev : (data.meridians[0]?.id ?? null))
    } catch (err) {
      console.error('Board reload failed:', err)
    }
  }, [])

  const panelOpen = Boolean(selectedItem)

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <IconSextant size={28} className="animate-pulse text-meridian-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-red-600 font-medium">Failed to load board</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-xs bg-meridian-600 text-white rounded-md hover:bg-meridian-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 board-px h-12 border-b border-gray-200 bg-white shrink-0">
        {/* ── Meridian switcher ── */}
        <div ref={meridianMenuRef} className="relative flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMeridianMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-gray-100 transition-colors group"
            title="Manage Meridians"
          >
            <IconSextant size={18} className="shrink-0 text-meridian-600" />
            <span className="text-gray-900 font-semibold text-sm tracking-tight">Meridian</span>
            <ChevronRight
              size={12}
              className={`text-gray-400 transition-transform duration-150 ${meridianMenuOpen ? 'rotate-90' : 'rotate-0'}`}
            />
          </button>

          {meridianMenuOpen && (
            <div className="absolute top-full left-0 mt-1 z-30 min-w-[260px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-[70vh] overflow-y-auto">
              {meridians.map((m, idx) => (
                <div key={m.id} className={idx > 0 ? 'border-t border-gray-100 mt-1 pt-1' : ''}>
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="flex-1 font-medium text-sm text-gray-800 truncate">{m.name}</span>
                    <span className="text-2xs text-gray-400 shrink-0">/{m.slug}</span>
                    {myRoles[m.id] === 'owner' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSettingsMeridian(m); setMeridianMenuOpen(false) }}
                        title="Manage members"
                        className="p-0.5 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shrink-0"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                  </div>

                  {/* Arcs under this meridian */}
                  {(arcsByMeridian[m.id] ?? []).map((arc) => (
                    <button
                      key={arc.id}
                      type="button"
                      onClick={() => {
                        setActiveMeridianId(m.id)
                        setFilters({ ...INITIAL_FILTERS, arcIds: [arc.id] })
                        setMeridianMenuOpen(false)
                      }}
                      className="flex items-center gap-2 pl-7 pr-3 py-1 w-full text-xs text-gray-600 hover:text-violet-700 hover:bg-violet-50 transition-colors group/arc"
                    >
                      <IconArc size={11} className="text-violet-400 shrink-0" />
                      <span className="flex-1 truncate text-left">{arc.title}</span>
                      {episodeCountByArc[arc.id] > 0 && (
                        <span className="text-2xs text-gray-400 shrink-0">
                          {episodeCountByArc[arc.id]}
                        </span>
                      )}
                    </button>
                  ))}

                  {(myRoles[m.id] === 'owner' || myRoles[m.id] === 'member') && (
                    <button
                      type="button"
                      onClick={() => { setNewArcMeridianId(m.id); setMeridianMenuOpen(false) }}
                      className="flex items-center gap-1.5 pl-7 pr-3 py-1 w-full text-xs text-gray-400 hover:text-violet-600 hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={11} />
                      Add Arc
                    </button>
                  )}
                </div>
              ))}

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => { setMeridianMenuOpen(false); setNewMeridianOpen(true) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-meridian-600 hover:bg-meridian-50 transition-colors"
                >
                  <Plus size={13} />
                  New Meridian
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hierarchy legend */}
        <div className="hidden md:flex items-center gap-1 border-l border-gray-200 ml-1 pl-4">
          {HIERARCHY.map(({ Icon, label, color }, i) => (
            <span key={label} className="flex items-center gap-1 text-xs">
              {i > 0 && <ChevronRight size={10} className="text-gray-300 mx-0.5" />}
              <Icon size={24} className={color} />
              <span className="text-gray-700">{label}</span>
            </span>
          ))}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleExport}
          title="Export to text"
          className="hidden sm:inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          <Download size={13} />
        </button>

        {userCanWrite && (
          <button
            type="button"
            onClick={() => setNewSprintOpen(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 text-xs font-medium transition-colors"
          >
            <Plus size={13} /> Sprint
          </button>
        )}

        {userCanWrite && (
          <button
            type="button"
            onClick={() => { setNewWorkContext(null); setNewWorkOpen(true) }}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-meridian-600 hover:bg-meridian-700 text-white text-xs font-medium transition-colors"
          >
            <Plus size={13} /> Work
          </button>
        )}

        {user && (
          <UserMenu
            displayName={user.displayName}
            email={user.email}
            userId={myUserId}
            userMap={userMap}
            logout={logout}
            onRename={handleRename}
          />
        )}
      </header>

      {/* ── Filter bar ── */}
      <FilterBar
        meridians={meridians}
        activeMeridianId={activeMeridianId}
        onMeridianChange={setActiveMeridianId}
        arcs={filterArcs}
        episodes={filterEpisodes}
        statuses={filterStatuses}
        users={users}
        sprints={sprints}
        filters={filters}
        onChange={setFilters}
        overdueOnly={overdueOnly}
        onOverdueToggle={() => setOverdueOnly((v) => !v)}
      />

      {/* ── Board + slide panel ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Scrollable board area */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Sprint sections ── */}
          {sprintGroups.map(({ sprint, items: sprintItems }) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              items={sprintItems}
              selectedId={selectedId}
              onSelect={handleSelect}
              onStatusCycle={handleStatusCycle}
              onUpdate={userCanWrite ? handleUpdateSprint : undefined}
              onItemUpdate={userCanWrite ? handleUpdateItem : undefined}
              onDelete={userCanManage ? handleDeleteSprint : undefined}
              onAddChild={userCanWrite ? handleAddChild : undefined}
              statusMap={statusMap}
              userMap={userMap}
              allItemMap={itemMap}
              defaultCollapsed={sprint.state === 'complete'}
              overdueOnly={overdueOnly}
            />
          ))}

          {/* ── Backlog section ── */}
          {filters.sprintId === null && (
            <div>
              <div
                className="flex items-center gap-3 board-px h-9 bg-gray-50 border-y border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none sticky top-0 z-10"
                onClick={() => setBacklogCollapsed((c) => !c)}
              >
                <ChevronRight
                  size={14}
                  className={`shrink-0 text-gray-400 transition-transform duration-150 ${backlogCollapsed ? '' : 'rotate-90'}`}
                />
                <span className="font-semibold text-sm text-gray-800">Backlog</span>
                <div className="flex-1" />
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {DEPTH_ICONS.map(({ type, Icon, color }) => (
                    <button key={type} type="button"
                      onClick={() => setBacklogDepth(type)}
                      title={`Show to ${type} level`}
                      className={`p-0.5 rounded transition-colors ${DEPTH_ORDER[type] <= DEPTH_ORDER[backlogDepth] ? color : 'text-gray-300 hover:text-gray-400'}`}
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">
                  {(() => { const n = backlogRows.filter((r) => r.type !== 'arc').length; return `${n} item${n !== 1 ? 's' : ''}` })()}
                </span>
              </div>

              {!backlogCollapsed && (
                backlogRows.length > 0
                  ? backlogRows
                      .filter((r) => overdueOnly || r.type === 'arc' || DEPTH_ORDER[r.type] <= DEPTH_ORDER[backlogDepth])
                      .map((row) => {
                      const clipped = !overdueOnly && row.type !== 'arc' && DEPTH_ORDER[row.type] === DEPTH_ORDER[backlogDepth]
                        ? { ...row, hasChildren: false }
                        : row
                      if (clipped.type === 'arc') {
                        return (
                          <ArcHeader
                            key={clipped.id}
                            arc={clipped}
                            isExpanded={expanded.has(clipped.id)}
                            isSelected={clipped.id === selectedId}
                            onToggle={handleToggle}
                            onSelect={handleSelect}
                            onAddChild={userCanWrite ? handleAddChild : undefined}
                          />
                        )
                      }
                      return (
                        <WorkItemRow
                          key={clipped.id}
                          item={clipped}
                          depth={Math.max(0, clipped.depth - 1)}
                          hasChildren={clipped.hasChildren}
                          isExpanded={expanded.has(clipped.id)}
                          isSelected={clipped.id === selectedId}
                          onToggle={handleToggle}
                          onSelect={handleSelect}
                          onStatusCycle={handleStatusCycle}
                          onUpdate={userCanWrite ? handleUpdateItem : undefined}
                          onAddChild={userCanWrite ? handleAddChild : undefined}
                          statusMap={statusMap}
                          userMap={userMap}
                          sprintMap={sprintMap}
                          itemMap={itemMap}
                        />
                      )
                    })
                  : (
                    <div className="px-12 py-3 text-sm text-gray-400 italic bg-white border-b border-gray-100">
                      No backlog items match the current filters.
                    </div>
                  )
              )}
            </div>
          )}
        </div>

        {/* ── Slide panel ── */}
        <div
          className={`
            absolute right-0 top-0 bottom-0 w-[40%] min-w-[360px] z-20
            border-l border-gray-200 shadow-xl
            transform transition-transform duration-200 ease-out
            ${panelOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <SlidePanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            statusMap={statusMap}
            userMap={userMap}
            sprintMap={sprintMap}
            meridianMap={meridianMap}
            itemMap={itemMap}
            childItems={childItems}
          />
        </div>
      </div>

      {/* ── FAB — mobile only ── */}
      {userCanWrite && (
        <button
          type="button"
          onClick={() => { setNewWorkContext(null); setNewWorkOpen(true) }}
          className="fixed bottom-6 right-5 z-50 flex sm:hidden items-center justify-center w-14 h-14 rounded-full bg-meridian-600 text-white shadow-xl active:scale-95 transition-transform"
          title="New Work"
        >
          <Plus size={28} />
        </button>
      )}

      {/* ── Footer ── */}
      <footer className="shrink-0 flex items-center justify-center gap-2 h-7 border-t border-gray-200 bg-white">
        <span className="text-2xs text-gray-400">Meridian Work Management | ©<a href="https://turnstone.ltd" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Turnstone.ltd</a> 2026</span>
        <img src="/turnstone.stone.png" alt="Turnstone" className="h-4 w-auto opacity-60" />
      </footer>

      {/* ── New Work modal ── */}
      {newWorkOpen && (
        <NewWorkModal
          items={items}
          statuses={statuses}
          initialContext={newWorkContext}
          onAdd={handleAddItem}
          onClose={() => { setNewWorkOpen(false); setNewWorkContext(null) }}
        />
      )}

      {/* ── New Sprint modal ── */}
      {newSprintOpen && (
        <NewSprintModal
          meridianId={activeMeridianId}
          onAdd={handleAddSprint}
          onClose={() => setNewSprintOpen(false)}
        />
      )}

      {/* ── New Meridian modal ── */}
      {newMeridianOpen && (
        <NewMeridianModal
          onAdd={handleAddMeridian}
          onClose={() => setNewMeridianOpen(false)}
        />
      )}

      {/* ── Meridian settings modal ── */}
      {settingsMeridian && (
        <MeridianSettingsModal
          meridian={settingsMeridian}
          myUserId={myUserId}
          statuses={statuses}
          allUsers={users}
          onClose={() => setSettingsMeridian(null)}
          onSaved={(updated) => {
            setMeridians((prev) => prev.map((m) => m.id === updated.id ? updated : m))
            setSettingsMeridian(updated)
          }}
          onDeleted={(id) => {
            setSettingsMeridian(null)
            setMeridians((prev) => prev.filter((m) => m.id !== id))
            setActiveMeridianId((prev) => prev === id ? (meridians.find((m) => m.id !== id)?.id ?? null) : prev)
          }}
          onLeft={() => { setSettingsMeridian(null); reloadBoard() }}
          onStatusesChanged={reloadBoard}
        />
      )}

      {/* ── Invite accept banner ── */}
      {inviteToken && (
        <InviteAcceptBanner
          token={inviteToken}
          onAccepted={({ meridianId }) => {
            // Strip ?invite from URL without a reload
            window.history.replaceState({}, '', window.location.pathname)
            setInviteToken(null)
            reloadBoard().then(() => setActiveMeridianId(meridianId))
          }}
          onDismiss={() => {
            window.history.replaceState({}, '', window.location.pathname)
            setInviteToken(null)
          }}
        />
      )}

      {/* ── New Arc modal ── */}
      {newArcMeridianId !== null && meridianMap[newArcMeridianId] && (
        <NewArcModal
          meridian={meridianMap[newArcMeridianId]}
          items={items}
          statuses={statuses}
          onAdd={handleAddItem}
          onClose={() => setNewArcMeridianId(null)}
        />
      )}
    </div>
  )
}

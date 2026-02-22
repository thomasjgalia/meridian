import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
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

// ── Lookup maps ───────────────────────────────────────────────────────────────

function toMap(arr, key = 'id') {
  return Object.fromEntries(arr.map((x) => [x[key], x]))
}

// ── Header hierarchy legend ───────────────────────────────────────────────────

const HIERARCHY = [
  { Icon: IconArc,     label: 'Arc',     color: 'text-violet-500' },
  { Icon: IconEpisode, label: 'Episode', color: 'text-indigo-600' },
  { Icon: IconSignal,  label: 'Signal',  color: 'text-teal-500'   },
  { Icon: IconRelay,   label: 'Relay',   color: 'text-orange-500' },
]

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
  Object.values(childrenOf).forEach((arr) => arr.sort((a, b) => a.position - b.position))

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

// ── Board ─────────────────────────────────────────────────────────────────────

const INITIAL_FILTERS = { meridianIds: [], arcIds: [], episodeIds: [], assigneeIds: [], statusIds: [], sprintId: null }

export default function Board() {
  const { user, logout } = useAuth()

  // ── Server state ──────────────────────────────────────────────────────────
  const [items,     setItems]     = useState([])
  const [meridians, setMeridians] = useState([])
  const [statuses,  setStatuses]  = useState([])
  const [users,     setUsers]     = useState([])
  const [sprints,   setSprints]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [expanded,          setExpanded]          = useState(new Set())
  const [backlogCollapsed,  setBacklogCollapsed]  = useState(false)
  const [selectedId,        setSelectedId]        = useState(null)
  const [filters,           setFilters]           = useState(INITIAL_FILTERS)
  const [newWorkOpen,       setNewWorkOpen]       = useState(false)
  const [newMeridianOpen,   setNewMeridianOpen]   = useState(false)
  const [meridianMenuOpen,  setMeridianMenuOpen]  = useState(false)
  const [newArcMeridianId,  setNewArcMeridianId]  = useState(null)

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
        // Start with all episodes expanded
        setExpanded(new Set(data.items.filter((i) => i.type === 'episode').map((i) => i.id)))
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

  // Arc and Episode lists for the filter bar
  const filterArcs = useMemo(() =>
    items.filter((i) => i.type === 'arc').map((i) => ({ id: i.id, name: i.title, parentId: i.parentId })),
    [items]
  )

  const allFilterEpisodes = useMemo(() =>
    items.filter((i) => i.type === 'episode').map((i) => ({ id: i.id, name: i.title, parentId: i.parentId })),
    [items]
  )

  const filterEpisodes = useMemo(() =>
    filters.arcIds.length > 0
      ? allFilterEpisodes.filter((ep) => filters.arcIds.includes(ep.parentId))
      : allFilterEpisodes,
    [allFilterEpisodes, filters.arcIds]
  )

  // ── Sprint groups ──────────────────────────────────────────────────────────
  const sprintGroups = useMemo(() =>
    sortedSprints
      .map((sprint) => ({
        sprint,
        items: items
          .filter((i) => i.sprintId === sprint.id && matchesFilters(i, filters, itemMap))
          .sort((a, b) => a.position - b.position),
      }))
      .filter((g) => filters.sprintId === null || filters.sprintId === g.sprint.id),
    [items, filters, itemMap, sortedSprints]
  )

  // ── Backlog rows ───────────────────────────────────────────────────────────
  const backlogRows = useMemo(() => {
    if (filters.sprintId !== null) return []
    const backlogItems = items.filter((i) => i.sprintId === null && i.type !== 'arc')
    return buildBacklogRows(backlogItems, itemMap, expanded, filters)
  }, [items, itemMap, expanded, filters])

  // ── Slide panel data ───────────────────────────────────────────────────────
  const selectedItem = selectedId ? itemMap[selectedId] : null
  const childItems   = selectedItem
    ? items.filter((i) => i.parentId === selectedItem.id).sort((a, b) => a.position - b.position)
    : []

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const handleStatusCycle = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const meridianStatuses = statuses
          .filter((s) => s.meridianId === item.meridianId)
          .sort((a, b) => a.position - b.position)
        if (!meridianStatuses.length) return item
        const idx       = meridianStatuses.findIndex((s) => s.id === item.statusId)
        const nextStatus = meridianStatuses[(idx + 1) % meridianStatuses.length]
        api.patch(`/api/items/${id}`, { field: 'statusId', value: nextStatus.id }).catch(console.error)
        return { ...item, statusId: nextStatus.id }
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

      return prev.map((item) => item.id === id ? { ...item, [field]: value } : item)
    })

    api.patch(`/api/items/${id}`, { field, value }).catch(console.error)
  }, [])

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

  const handleAddMeridian = useCallback(async ({ name, slug, color }) => {
    try {
      const created = await api.post('/api/meridians', { name, slug, color })
      // Re-fetch board so seeded statuses are included
      const data = await api.get('/api/board')
      setMeridians(data.meridians)
      setStatuses(data.statuses)
      setSprints(data.sprints)
      setUsers(data.users)
      setItems(data.items)
      return created
    } catch (err) {
      console.error('Failed to create meridian:', err)
      throw err
    }
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

  const panelOpen = Boolean(selectedItem)

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <IconSextant size={28} className="text-meridian-600 animate-pulse" />
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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 h-12 border-b border-gray-200 bg-white shrink-0">
        {/* ── Meridian switcher ── */}
        <div ref={meridianMenuRef} className="relative flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMeridianMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-gray-100 transition-colors group"
            title="Meridians"
          >
            <IconSextant size={20} className="text-meridian-600 shrink-0" />
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
                  </div>

                  {(arcsByMeridian[m.id] ?? []).map((arc) => (
                    <div key={arc.id} className="flex items-center gap-1.5 pl-7 pr-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
                      <IconArc size={12} className="text-violet-500 shrink-0" />
                      <span className="flex-1 truncate">{arc.title}</span>
                      {episodeCountByArc[arc.id] > 0 && (
                        <span className="text-2xs text-gray-400 shrink-0">
                          {episodeCountByArc[arc.id]} ep
                        </span>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => { setNewArcMeridianId(m.id); setMeridianMenuOpen(false) }}
                    className="flex items-center gap-1.5 pl-7 pr-3 py-1 w-full text-xs text-gray-400 hover:text-violet-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={11} />
                    Add Arc
                  </button>
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
              <Icon size={12} className={color} />
              <span className="text-gray-700">{label}</span>
            </span>
          ))}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setNewWorkOpen(true)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-meridian-600 hover:bg-meridian-700 text-white text-xs font-medium transition-colors"
        >
          <Plus size={13} /> New Work
        </button>

        {user && (
          <button
            type="button"
            onClick={logout}
            title={`${user.displayName} — click to sign out`}
            className="ml-1"
          >
            <Avatar user={user} size={28} />
          </button>
        )}
      </header>

      {/* ── Filter bar ── */}
      <FilterBar
        meridians={meridians}
        arcs={filterArcs}
        episodes={filterEpisodes}
        statuses={statuses}
        users={users}
        sprints={sprints}
        filters={filters}
        onChange={setFilters}
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
              statusMap={statusMap}
              userMap={userMap}
              allItemMap={itemMap}
              defaultCollapsed={sprint.state === 'complete'}
            />
          ))}

          {/* ── Backlog section ── */}
          {filters.sprintId === null && (
            <div>
              <div
                className="flex items-center gap-3 px-4 h-9 bg-gray-50 border-y border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none sticky top-0 z-10"
                onClick={() => setBacklogCollapsed((c) => !c)}
              >
                <ChevronRight
                  size={14}
                  className={`shrink-0 text-gray-400 transition-transform duration-150 ${backlogCollapsed ? '' : 'rotate-90'}`}
                />
                <span className="font-semibold text-sm text-gray-800">Backlog</span>
                <div className="flex-1" />
                <span className="text-xs text-gray-400">
                  {backlogRows.length} item{backlogRows.length !== 1 ? 's' : ''}
                </span>
              </div>

              {!backlogCollapsed && (
                backlogRows.length > 0
                  ? backlogRows.map((row) => (
                      <WorkItemRow
                        key={row.id}
                        item={row}
                        depth={row.depth}
                        hasChildren={row.hasChildren}
                        isExpanded={expanded.has(row.id)}
                        isSelected={row.id === selectedId}
                        onToggle={handleToggle}
                        onSelect={handleSelect}
                        onStatusCycle={handleStatusCycle}
                        statusMap={statusMap}
                        userMap={userMap}
                        sprintMap={{}}
                        itemMap={itemMap}
                      />
                    ))
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

      {/* ── New Work modal ── */}
      {newWorkOpen && (
        <NewWorkModal
          items={items}
          statuses={statuses}
          onAdd={handleAddItem}
          onClose={() => setNewWorkOpen(false)}
        />
      )}

      {/* ── New Meridian modal ── */}
      {newMeridianOpen && (
        <NewMeridianModal
          onAdd={handleAddMeridian}
          onClose={() => setNewMeridianOpen(false)}
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

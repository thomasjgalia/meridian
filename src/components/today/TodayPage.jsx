import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../api/client'
import { IconSextant } from '../icons'
import Avatar from '../ui/Avatar'
import SlidePanel from '../board/SlidePanel'
import TodayItemRow from './TodayItemRow'
import NewTodoModal from './NewTodoModal'
import AddFromSprintModal from './AddFromSprintModal'
import CarryOverBanner from './CarryOverBanner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMap(arr, key = 'id') {
  return Object.fromEntries(arr.map((x) => [x[key], x]))
}


function formatDateLong(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function isToday(dateStr) {
  return dateStr === new Date().toLocaleDateString('en-CA')
}

// ── User menu (shared pattern from Board) ─────────────────────────────────────

function UserMenu({ displayName, email, logout }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={displayName}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-meridian-400"
      >
        <Avatar user={{ displayName }} size={28} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
          <div className="px-3 pb-2.5 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
            {email && <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>}
          </div>
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

// ── TodayPage ─────────────────────────────────────────────────────────────────

export default function TodayPage({ onNavigate, defaultMeridianId }) {
  const { user, logout } = useAuth()
  const todayStr = new Date().toLocaleDateString('en-CA')

  // ── Data state ─────────────────────────────────────────────────────────────
  const [date,              setDate]              = useState(todayStr)
  const [plan,              setPlan]              = useState([])  // [{ itemId, position }]
  const [items,             setItems]             = useState([])  // WorkItems in plan
  const [activeSprintItems, setActiveSprintItems] = useState([])  // sprint items available to add
  const [statuses,          setStatuses]          = useState([])
  const [users,             setUsers]             = useState([])
  const [meridians,         setMeridians]         = useState([])
  const [sprints,           setSprints]           = useState([])
  const [myUserId,          setMyUserId]          = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState(null)
  const [carryOver,         setCarryOver]         = useState(null)  // { fromDate, count }
  const [prevDate,          setPrevDate]          = useState(null)  // nearest past plan date
  const [nextDate,          setNextDate]          = useState(null)  // nearest future plan date (≤ today)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeMeridianId,   setActiveMeridianId]   = useState(defaultMeridianId ?? null)
  const [selectedId,         setSelectedId]         = useState(null)
  const [newTodoOpen,        setNewTodoOpen]        = useState(false)
  const [addFromSprintOpen,  setAddFromSprintOpen]  = useState(false)

  // ── Derived maps ───────────────────────────────────────────────────────────
  const itemMap     = useMemo(() => toMap(items),     [items])
  const statusMap   = useMemo(() => toMap(statuses),  [statuses])
  const userMap     = useMemo(() => toMap(users),     [users])
  const sprintMap   = useMemo(() => toMap(sprints),   [sprints])
  const meridianMap = useMemo(() => toMap(meridians), [meridians])

  const activeMeridian = activeMeridianId ? meridianMap[activeMeridianId] ?? null : null

  // Ordered plan items joined with full item data
  const planItems = useMemo(() =>
    [...plan]
      .sort((a, b) => a.position - b.position)
      .map((p) => items.find((i) => i.id === p.itemId))
      .filter(Boolean),
    [plan, items]
  )

  const selectedItem = selectedId ? itemMap[selectedId] ?? null : null
  const childItems   = useMemo(() =>
    selectedItem ? items.filter((i) => i.parentId === selectedItem.id) : [],
    [items, selectedItem]
  )

  const completedCount = planItems.filter((i) => statusMap[i.statusId]?.isComplete).length

  // ── Load today data ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelectedId(null)
    api.get(`/api/today?date=${date}`)
      .then((data) => {
        setPlan(data.plan ?? [])
        setItems(data.items ?? [])
        setActiveSprintItems(data.activeSprintItems ?? [])
        setStatuses(data.statuses ?? [])
        setUsers(data.users ?? [])
        setMeridians(data.meridians ?? [])
        setSprints(data.sprints ?? [])
        setMyUserId(data.myUserId ?? null)
        setCarryOver(data.carryOver ?? null)
        setPrevDate(data.prevDate ?? null)
        setNextDate(data.nextDate ?? null)
        if (!activeMeridianId && data.meridians?.length > 0) {
          setActiveMeridianId(data.meridians[0].id)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // ── DnD setup ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setPlan((prev) => {
      const sorted   = [...prev].sort((a, b) => a.position - b.position)
      const oldIndex = sorted.findIndex((p) => p.itemId === active.id)
      const newIndex = sorted.findIndex((p) => p.itemId === over.id)
      const reordered = arrayMove(sorted, oldIndex, newIndex)
        .map((p, i) => ({ ...p, position: i }))
      api.patch('/api/today/reorder', { date, positions: reordered }).catch(console.error)
      return reordered
    })
  }

  // ── Item handlers ──────────────────────────────────────────────────────────

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
        api.patch(`/api/items/${id}`, { field: 'statusId', value: nextStatus.id }).catch(console.error)
        return { ...item, statusId: nextStatus.id }
      })
    )
  }, [statuses])

  const handleUpdateItem = useCallback((id, field, value) => {
    setItems((prev) => prev.map((item) => item.id !== id ? item : { ...item, [field]: value }))
    api.patch(`/api/items/${id}`, { field, value }).catch(console.error)
  }, [])

  const handleDeleteItem = useCallback((id) => {
    const item = items.find((i) => i.id === id)
    setPlan((prev) => prev.filter((p) => p.itemId !== id))
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelectedId(null)
    // For sprint items: only remove from plan; for todos: also delete the work item
    if (item?.type !== 'todo') {
      api.delete(`/api/today/plan/${id}?date=${date}`).catch(console.error)
    } else {
      api.delete(`/api/items/${id}`).catch(console.error)
    }
  }, [items, date])

  const handleSelect = useCallback((id) => {
    setSelectedId((prev) => prev === id ? null : id)
  }, [])

  // ── Add to do ─────────────────────────────────────────────────────────────

  const handleAddTodo = useCallback(async ({ title }) => {
    if (!activeMeridianId) return
    const defaultStatus = statuses.find((s) => s.meridianId === activeMeridianId && s.isDefault)
      ?? statuses.find((s) => s.isDefault)
      ?? statuses[0]
    const tempId   = -(Date.now())
    const tempItem = {
      id: tempId, type: 'todo', title,
      description: null,
      meridianId:  activeMeridianId,
      assigneeId:  myUserId,
      statusId:    defaultStatus?.id ?? null,
      dueDate:     date,
      parentId:    null,
      sprintId:    null,
      position:    planItems.length,
    }
    setItems((prev) => [...prev, tempItem])
    setPlan((prev) => [...prev, { itemId: tempId, position: prev.length }])
    try {
      const created = await api.post('/api/items', {
        type: 'todo', title,
        description:  null,
        meridianId:   activeMeridianId,
        assigneeId:   myUserId,
        statusId:     defaultStatus?.id ?? null,
        dueDate:      date,
        parentId:     null,
        sprintId:     null,
        position:     planItems.length,
      })
      await api.post('/api/today/plan', { date, itemId: created.id })
      setItems((prev) => prev.map((i) => i.id === tempId ? created : i))
      setPlan((prev) => prev.map((p) => p.itemId === tempId ? { ...p, itemId: created.id } : p))
    } catch (err) {
      console.error('Failed to create todo:', err)
      setItems((prev) => prev.filter((i) => i.id !== tempId))
      setPlan((prev) => prev.filter((p) => p.itemId !== tempId))
    }
  }, [activeMeridianId, statuses, myUserId, planItems.length, date])

  // ── Add sprint item to plan ────────────────────────────────────────────────

  const handleAddSprintItem = useCallback(async (itemId) => {
    const sprintItem = activeSprintItems.find((i) => i.id === itemId)
    if (!sprintItem) return
    setActiveSprintItems((prev) => prev.filter((i) => i.id !== itemId))
    setItems((prev) => [...prev, sprintItem])
    setPlan((prev) => [...prev, { itemId, position: prev.length }])
    try {
      await api.post('/api/today/plan', { date, itemId })
    } catch (err) {
      console.error('Failed to add sprint item:', err)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      setPlan((prev) => prev.filter((p) => p.itemId !== itemId))
      setActiveSprintItems((prev) => [...prev, sprintItem])
    }
  }, [activeSprintItems, date])

  // ── Remove sprint item from plan ──────────────────────────────────────────

  const handleRemoveFromPlan = useCallback((id) => {
    const item = items.find((i) => i.id === id)
    if (!item || item.type === 'todo') return
    setItems((prev) => prev.filter((i) => i.id !== id))
    setPlan((prev) => prev.filter((p) => p.itemId !== id))
    setActiveSprintItems((prev) => [...prev, item])
    if (selectedId === id) setSelectedId(null)
    api.delete(`/api/today/plan/${id}?date=${date}`).catch(console.error)
  }, [items, selectedId, date])

  // ── Carry over ────────────────────────────────────────────────────────────

  const handleCarryOver = useCallback(async () => {
    const data = await api.post('/api/today/carryover', { fromDate: carryOver.fromDate, toDate: date })
    setPlan(data.plan ?? [])
    setItems(data.items ?? [])
    setActiveSprintItems(data.activeSprintItems ?? [])
    setCarryOver(null)
  }, [carryOver, date])

  // ── Date navigation ────────────────────────────────────────────────────────

  function goToPrev() { if (prevDate) setDate(prevDate) }
  function goToNext() { if (nextDate) setDate(nextDate) }

  const panelOpen = Boolean(selectedItem)

  // ── Loading / error ────────────────────────────────────────────────────────

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
          <p className="text-sm text-red-600 font-medium">Failed to load today's activity</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); setDate(date) }}
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

        {/* Back to Board */}
        <button
          type="button"
          onClick={() => onNavigate('board', activeMeridianId)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
        >
          <ChevronLeft size={15} />
          <IconSextant size={16} className="text-meridian-600" />
          <span className="hidden sm:inline font-medium text-gray-700">Board</span>
        </button>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* Page title */}
        <span className="font-semibold text-sm text-gray-900 tracking-tight">Today's Activity</span>

        {/* Meridian color indicator */}
        {activeMeridian && (
          <span
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeMeridian.color }} />
            {activeMeridian.name}
          </span>
        )}

        <div className="flex-1" />

        {/* Date navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={goToPrev}
            disabled={!prevDate}
            className="flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={prevDate ? `Go to ${prevDate}` : 'No earlier plans'}
          >
            <ChevronLeft size={14} />
          </button>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isToday(date) ? 'bg-teal-50 text-teal-700' : 'text-gray-600'}`}>
            {isToday(date) ? 'Today' : new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
          <button
            type="button"
            onClick={goToNext}
            disabled={!nextDate}
            className="flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={nextDate ? `Go to ${nextDate}` : 'No later plans'}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {user && <UserMenu displayName={user.displayName} email={user.email} logout={logout} />}
      </header>

      {/* ── Carry-over banner ── */}
      <CarryOverBanner
        carryOver={carryOver}
        onCarryOver={handleCarryOver}
        onDismiss={() => setCarryOver(null)}
      />

      {/* ── Main content + slide panel ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Scrollable plan area */}
        <div className="flex-1 overflow-y-auto">

          {/* Date heading + progress */}
          <div className="flex items-center justify-between board-px py-3 border-b border-gray-100">
            <div>
              <h1 className="text-base font-semibold text-gray-900">{formatDateLong(date)}</h1>
              {planItems.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {completedCount} of {planItems.length} complete
                </p>
              )}
            </div>
          </div>

          {/* Plan list */}
          {planItems.length === 0 ? (
            <div className="board-px py-10 text-center text-sm text-gray-400 italic">
              No items planned for this day yet. Add a To Do or pull in items from the active sprint.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={planItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {planItems.map((item) => (
                  <TodayItemRow
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedId}
                    onSelect={handleSelect}
                    onStatusCycle={handleStatusCycle}
                    onUpdate={handleUpdateItem}
                    onRemoveFromPlan={item.type !== 'todo' ? handleRemoveFromPlan : undefined}
                    statusMap={statusMap}
                    userMap={userMap}
                    sprintMap={sprintMap}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 board-px py-4">
            <button
              type="button"
              onClick={() => setNewTodoOpen(true)}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600 text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              Add To Do
            </button>
            <button
              type="button"
              onClick={() => setAddFromSprintOpen(true)}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-meridian-400 hover:text-meridian-600 text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              Add from Sprint
            </button>
          </div>
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

      {/* ── Footer ── */}
      <footer className="shrink-0 flex items-center justify-center gap-2 h-7 border-t border-gray-200 bg-white">
        <span className="text-2xs text-gray-400">Meridian Work Management | ©<a href="https://turnstone.ltd" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Turnstone.ltd</a> 2026</span>
        <img src="/turnstone.stone.png" alt="Turnstone" className="h-4 w-auto opacity-60" />
      </footer>

      {/* ── Modals ── */}
      {newTodoOpen && (
        <NewTodoModal
          meridian={activeMeridian}
          date={date}
          onAdd={handleAddTodo}
          onClose={() => setNewTodoOpen(false)}
        />
      )}

      {addFromSprintOpen && (
        <AddFromSprintModal
          activeSprintItems={activeMeridianId
            ? activeSprintItems.filter((i) => i.meridianId === activeMeridianId)
            : activeSprintItems}
          statusMap={statusMap}
          userMap={userMap}
          sprintMap={sprintMap}
          onAdd={handleAddSprintItem}
          onClose={() => setAddFromSprintOpen(false)}
        />
      )}
    </div>
  )
}

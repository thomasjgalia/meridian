import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check, SlidersHorizontal } from 'lucide-react'

// ── Meridian switcher ─────────────────────────────────────────────────────────

function MeridianSwitcher({ meridians, activeMeridianId, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const active = meridians.find((m) => m.id === activeMeridianId)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
      >
        {active && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active.color }} />
        )}
        <span>{active ? active.name : 'Meridian'}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {meridians.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              <span className={`flex-1 text-left ${m.id === activeMeridianId ? 'font-semibold text-gray-900' : ''}`}>
                {m.name}
              </span>
              {m.id === activeMeridianId && <Check size={11} className="text-meridian-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Consolidated filter dropdown ──────────────────────────────────────────────

function FilterSection({ title, options, selected, onToggle, colorKey, nameKey = 'name', single = false }) {
  if (!options.length) return null

  return (
    <div>
      <div className="px-3 pt-2.5 pb-1 text-2xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      {options.map((opt) => {
        const checked = single ? selected === opt.id : selected.includes(opt.id)
        const color   = colorKey ? opt[colorKey] : null
        const label   = opt[nameKey] ?? opt.displayName ?? opt.name
        return (
          <label
            key={opt.id}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 text-gray-700"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(opt.id)}
              className="accent-teal-500 w-3 h-3 rounded shrink-0"
            />
            {color && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            )}
            <span className="truncate">{label}</span>
          </label>
        )
      })}
    </div>
  )
}

function FilterDropdown({ arcs, episodes, statuses, users, sprints, filters, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalActive =
    filters.arcIds.length +
    filters.episodeIds.length +
    filters.assigneeIds.length +
    filters.statusIds.length +
    (filters.sprintId !== null ? 1 : 0)

  const active = totalActive > 0

  function clearAll() {
    onChange({ ...filters, arcIds: [], episodeIds: [], assigneeIds: [], statusIds: [], sprintId: null })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors
          ${active
            ? 'bg-meridian-50 border-meridian-300 text-meridian-700'
            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'}
        `}
      >
        <SlidersHorizontal size={12} />
        Filter
        {active && (
          <span className="bg-meridian-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-2xs font-bold">
            {totalActive}
          </span>
        )}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-[70vh]">

          <FilterSection
            title="Arc"
            options={arcs}
            selected={filters.arcIds}
            onToggle={(id) => {
              const next = filters.arcIds.includes(id)
                ? filters.arcIds.filter((x) => x !== id)
                : [...filters.arcIds, id]
              onChange({ ...filters, arcIds: next, episodeIds: [] })
            }}
          />

          <FilterSection
            title="Episode"
            options={episodes}
            selected={filters.episodeIds}
            onToggle={(id) => {
              const next = filters.episodeIds.includes(id)
                ? filters.episodeIds.filter((x) => x !== id)
                : [...filters.episodeIds, id]
              onChange({ ...filters, episodeIds: next })
            }}
          />

          <FilterSection
            title="Assignee"
            options={users}
            selected={filters.assigneeIds}
            nameKey="displayName"
            onToggle={(id) => {
              const next = filters.assigneeIds.includes(id)
                ? filters.assigneeIds.filter((x) => x !== id)
                : [...filters.assigneeIds, id]
              onChange({ ...filters, assigneeIds: next })
            }}
          />

          <FilterSection
            title="Status"
            options={statuses}
            selected={filters.statusIds}
            colorKey="color"
            onToggle={(id) => {
              const next = filters.statusIds.includes(id)
                ? filters.statusIds.filter((x) => x !== id)
                : [...filters.statusIds, id]
              onChange({ ...filters, statusIds: next })
            }}
          />

          <FilterSection
            title="Sprint"
            options={sprints}
            selected={filters.sprintId}
            single
            onToggle={(id) => onChange({ ...filters, sprintId: filters.sprintId === id ? null : id })}
          />

          {active && (
            <div className="px-3 py-2 border-t border-gray-100 mt-1">
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={11} /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

export default function FilterBar({ meridians, activeMeridianId, onMeridianChange, arcs, episodes, statuses, users, sprints, filters, onChange }) {
  return (
    <div className="flex items-center gap-2 board-px h-9 border-b border-gray-200 bg-white shrink-0">
      <MeridianSwitcher
        meridians={meridians}
        activeMeridianId={activeMeridianId}
        onChange={onMeridianChange}
      />

      <div className="w-px h-4 bg-gray-200" />

      <FilterDropdown
        arcs={arcs}
        episodes={episodes}
        statuses={statuses}
        users={users}
        sprints={sprints}
        filters={filters}
        onChange={onChange}
      />
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

// Generic multi-select pill dropdown
function FilterPill({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const active = selected.length > 0

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(id) {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    )
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
        {label}
        {active && (
          <span className="bg-meridian-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-2xs font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {options.map((opt) => {
            const checked = selected.includes(opt.id)
            return (
              <label
                key={opt.id}
                className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.id)}
                  className="accent-teal-500 w-3 h-3 rounded"
                />
                {opt.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.name ?? opt.displayName}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Single-select meridian switcher — lives in the filter bar
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

export default function FilterBar({ meridians, activeMeridianId, onMeridianChange, arcs, episodes, statuses, users, sprints, filters, onChange }) {
  const hasAny =
    filters.arcIds.length      > 0 ||
    filters.episodeIds.length  > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.statusIds.length   > 0 ||
    filters.sprintId !== null

  function clear() {
    onChange({ ...filters, arcIds: [], episodeIds: [], assigneeIds: [], statusIds: [], sprintId: null })
  }

  return (
    <div className="flex items-center gap-2 px-4 h-9 border-b border-gray-200 bg-white shrink-0">
      <MeridianSwitcher
        meridians={meridians}
        activeMeridianId={activeMeridianId}
        onChange={onMeridianChange}
      />

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <span className="text-2xs font-medium text-gray-400 uppercase tracking-wider mr-1">
        Filter
      </span>

      <FilterPill
        label="Arc"
        options={arcs}
        selected={filters.arcIds}
        onChange={(v) => onChange({ ...filters, arcIds: v, episodeIds: [] })}
      />
      <FilterPill
        label="Episode"
        options={episodes}
        selected={filters.episodeIds}
        onChange={(v) => onChange({ ...filters, episodeIds: v })}
      />
      <FilterPill
        label="Assignee"
        options={users}
        selected={filters.assigneeIds}
        onChange={(v) => onChange({ ...filters, assigneeIds: v })}
      />
      <FilterPill
        label="Status"
        options={statuses}
        selected={filters.statusIds}
        onChange={(v) => onChange({ ...filters, statusIds: v })}
      />
      <FilterPill
        label="Sprint"
        options={sprints}
        selected={filters.sprintId !== null ? [filters.sprintId] : []}
        onChange={(v) => onChange({ ...filters, sprintId: v.at(-1) ?? null })}
      />

      {hasAny && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1"
        >
          <X size={11} /> Clear
        </button>
      )}
    </div>
  )
}

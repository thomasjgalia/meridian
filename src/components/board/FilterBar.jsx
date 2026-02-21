import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

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

export default function FilterBar({ meridians, arcs, episodes, statuses, users, sprints, filters, onChange }) {
  const hasAny =
    filters.meridianIds.length > 0 ||
    filters.arcIds.length      > 0 ||
    filters.episodeIds.length  > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.statusIds.length   > 0 ||
    filters.sprintId !== null

  function clear() {
    onChange({ meridianIds: [], arcIds: [], episodeIds: [], assigneeIds: [], statusIds: [], sprintId: null })
  }

  return (
    <div className="flex items-center gap-2 px-4 h-9 border-b border-gray-200 bg-white shrink-0">
      <span className="text-2xs font-medium text-gray-400 uppercase tracking-wider mr-1">
        Filter
      </span>

      <FilterPill
        label="Meridian"
        options={meridians}
        selected={filters.meridianIds}
        onChange={(v) => onChange({ ...filters, meridianIds: v, arcIds: [], episodeIds: [] })}
      />
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

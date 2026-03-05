import { useState, useMemo } from 'react'
import { X, Check } from 'lucide-react'
import { TYPE_ICONS } from '../icons'
import { StatusDot } from '../ui/StatusChip'
import Avatar from '../ui/Avatar'

const TYPE_COLOR = {
  signal: 'text-rose-600',
  relay:  'text-orange-500',
}

export default function AddFromSprintModal({
  activeSprintItems,
  statusMap,
  userMap,
  sprintMap,
  onAdd,
  onClose,
}) {
  const [selected, setSelected] = useState(new Set())

  // Group by sprint for display
  const groups = useMemo(() => {
    const map = {}
    for (const item of activeSprintItems) {
      const sprintId = item.sprintId ?? 'none'
      if (!map[sprintId]) map[sprintId] = []
      map[sprintId].push(item)
    }
    return Object.entries(map).map(([sprintId, items]) => ({
      sprint: sprintMap[sprintId] ?? null,
      items,
    }))
  }, [activeSprintItems, sprintMap])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleConfirm() {
    for (const id of selected) onAdd(id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[70vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Add from Active Sprint</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select items to include in today's plan</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {activeSprintItems.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 italic text-center">
              All active sprint items are already in today's plan.
            </p>
          ) : (
            groups.map(({ sprint, items }) => (
              <div key={sprint?.id ?? 'none'}>
                {sprint && (
                  <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                    <span className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                      {sprint.name}
                    </span>
                  </div>
                )}
                {items.map((item) => {
                  const Icon   = TYPE_ICONS[item.type]
                  const status = statusMap[item.statusId]
                  const user   = userMap[item.assigneeId]
                  const isChecked = selected.has(item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-5 py-2.5 text-left border-b border-gray-100
                        hover:bg-gray-50 transition-colors
                        ${isChecked ? 'bg-teal-50' : ''}
                      `}
                    >
                      {/* Checkbox */}
                      <div className={`
                        flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-colors
                        ${isChecked ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}
                      `}>
                        {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>

                      {Icon && <Icon size={15} className={`shrink-0 ${TYPE_COLOR[item.type]}`} />}

                      <span className="flex-1 text-sm text-gray-800 truncate">{item.title}</span>

                      <Avatar user={user} size={18} className="shrink-0 opacity-50" />
                      <StatusDot status={status} />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <span className="text-xs text-gray-400">
            {selected.size > 0 ? `${selected.size} item${selected.size !== 1 ? 's' : ''} selected` : 'Select items above'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-md text-sm text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="h-8 px-3.5 rounded-md text-sm font-medium bg-meridian-600 text-white hover:bg-meridian-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

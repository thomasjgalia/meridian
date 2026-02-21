import { useState } from 'react'
import { X } from 'lucide-react'
import { IconArc } from '../icons'

export default function NewArcModal({ meridian, items, statuses, onAdd, onClose }) {
  const [title, setTitle] = useState('')
  const isValid = title.trim().length > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return
    const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0]
    const maxId    = items.reduce((m, i) => Math.max(m, i.id), 0)
    const siblings = items.filter((i) => i.type === 'arc' && i.meridianId === meridian.id)
    onAdd({
      id:          maxId + 1,
      meridianId:  meridian.id,
      parentId:    null,
      type:        'arc',
      title:       title.trim(),
      statusId:    defaultStatus.id,
      assigneeId:  null,
      sprintId:    null,
      position:    siblings.length,
      description: null,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <IconArc size={16} className="text-violet-500" />
            <h2 className="font-semibold text-gray-900">New Arc</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">

          {/* Meridian context */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meridian.color }} />
            <span className="font-medium text-gray-700">{meridian.name}</span>
            <span className="text-gray-400">· this Arc will belong to this Meridian</span>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
              Arc Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name this arc…"
              autoFocus
              className="h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-md text-sm text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="h-8 px-3.5 rounded-md text-sm font-medium bg-meridian-600 text-white hover:bg-meridian-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create Arc
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

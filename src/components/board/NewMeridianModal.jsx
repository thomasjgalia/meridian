import { useState } from 'react'
import { X, Check } from 'lucide-react'

const PRESET_COLORS = [
  '#0D9488', // teal
  '#7C3AED', // purple
  '#3B82F6', // blue
  '#F43F5E', // rose
  '#F97316', // orange
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EC4899', // pink
  '#14B8A6', // cyan
]

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewMeridianModal({ onAdd, onClose }) {
  const [name,  setName]  = useState('')
  const [slug,  setSlug]  = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [slugEdited, setSlugEdited] = useState(false)

  function handleNameChange(v) {
    setName(v)
    if (!slugEdited) setSlug(toSlug(v))
  }

  function handleSlugChange(v) {
    setSlugEdited(true)
    setSlug(toSlug(v) || v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  const isValid = name.trim().length > 0 && slug.length > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return
    onAdd({ name: name.trim(), slug, color })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Meridian</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">

          {/* Color swatches */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Color</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color === c && <Check size={13} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview + Name */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
              Name
            </label>
            <div className="flex items-center gap-2">
              {/* Live color preview dot */}
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Platform, Mobile, Data…"
                autoFocus
                className="flex-1 h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
              />
            </div>
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
              Slug
            </label>
            <div className="flex items-center h-8 rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-meridian-500 focus-within:border-transparent hover:border-gray-400 overflow-hidden">
              <span className="px-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 h-full flex items-center shrink-0">
                /
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="platform"
                className="flex-1 px-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-white h-full"
              />
            </div>
            <p className="text-2xs text-gray-400">Used in URLs. Auto-generated from name.</p>
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
              className="h-8 px-3.5 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: isValid ? color : undefined }}
            >
              Create Meridian
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

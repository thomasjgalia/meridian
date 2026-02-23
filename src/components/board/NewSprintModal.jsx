import { useState, useMemo } from 'react'
import { X } from 'lucide-react'

const STATE_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active',   label: 'Active'   },
  { value: 'complete', label: 'Complete' },
]

export default function NewSprintModal({ meridianId, onAdd, onClose }) {
  const [name,      setName]      = useState('')
  const [goal,      setGoal]      = useState('')
  const [state,     setState]     = useState('planning')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [error,     setError]     = useState(null)
  const [saving,    setSaving]    = useState(false)

  const isValid = useMemo(() => name.trim().length > 0, [name])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || saving) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        name:       name.trim(),
        goal:       goal.trim() || null,
        state,
        startDate:  startDate || null,
        endDate:    endDate   || null,
        meridianId,
      })
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Sprint</h2>
          <button type="button" onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Sprint Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 1 or Week of 3 Mar"
              autoFocus
              className="h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
            />
          </div>

          {/* Goal */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
              Goal <span className="normal-case font-normal text-gray-300">(optional)</span>
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this sprint accomplish?"
              rows={2}
              className="px-2.5 py-1.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
            />
          </div>

          {/* State */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">State</label>
            <div className="flex gap-2">
              {STATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setState(opt.value)}
                  className={`flex-1 h-8 rounded-md border text-xs font-medium transition-colors ${
                    state === opt.value
                      ? 'border-meridian-400 bg-meridian-50 text-meridian-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 px-1">{error}</p>}

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
              disabled={!isValid || saving}
              className="h-8 px-3.5 rounded-md text-sm font-medium bg-meridian-600 text-white hover:bg-meridian-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating…' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

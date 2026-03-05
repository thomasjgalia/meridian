import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'

export default function CarryOverBanner({ carryOver, onCarryOver, onDismiss }) {
  const [loading, setLoading] = useState(false)

  if (!carryOver) return null

  const fromDate = new Date(carryOver.fromDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  async function handleCarryOver() {
    setLoading(true)
    try { await onCarryOver() } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-sm shrink-0">
      <ArrowRight size={15} className="text-amber-500 shrink-0" />
      <span className="flex-1 text-amber-800">
        <span className="font-medium">{carryOver.count} incomplete item{carryOver.count !== 1 ? 's' : ''}</span>
        {' '}from {fromDate}. Carry over to today?
      </span>
      <button
        type="button"
        onClick={handleCarryOver}
        disabled={loading}
        className="shrink-0 text-xs font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
      >
        {loading ? 'Carrying over…' : 'Carry over'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded text-amber-400 hover:text-amber-700 transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

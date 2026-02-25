import { Activity, X, Check, Inbox } from 'lucide-react'

/**
 * Returns the icon component for a status.
 * Derived from flags so it survives status renames.
 */
function statusIcon(status) {
  if (status.isDefault)  return Inbox     // Standby
  if (status.isBlocked)  return X         // Static
  if (status.isComplete) return Check     // Over
  return Activity                         // Live (catch-all for in-progress)
}

/**
 * StatusDot — compact 14×14 status indicator for space-constrained row views.
 * Standby: colored square. Live/Static/Over: colored icon.
 * Shows status name as a tooltip; click cycles status.
 */
export function StatusDot({ status, onClick }) {
  if (!status) return <div className="w-[22px] h-[22px] shrink-0" />

  const Icon = statusIcon(status)
  const interactClass = onClick
    ? 'cursor-pointer hover:brightness-125 focus-visible:outline focus-visible:outline-2'
    : 'cursor-default'

  if (!Icon) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={status.name}
        style={{ backgroundColor: status.color }}
        className={`w-[22px] h-[22px] rounded-sm shrink-0 transition-all ${interactClass}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={status.name}
      style={{ color: status.color }}
      className={`w-[22px] h-[22px] flex items-center justify-center shrink-0 transition-all ${interactClass}`}
    >
      <Icon size={22} strokeWidth={2} />
    </button>
  )
}

/**
 * StatusChip — colored pill showing a work item's status.
 * Clicking it cycles to the next status (or calls onCycle if provided).
 */
export default function StatusChip({ status, onClick, size = 'sm' }) {
  if (!status) return null

  const bg    = status.color + '1a'   // 10% opacity fill
  const text  = status.color
  const ring  = status.color + '40'   // 25% opacity ring

  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1.5'
    : 'px-2.5 py-1 text-sm gap-2'

  const Icon = statusIcon(status)

  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? 'Click to change status' : status.name}
      style={{ backgroundColor: bg, color: text, outlineColor: ring }}
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap
        ${sizeClass}
        ${onClick ? 'cursor-pointer hover:brightness-110 focus-visible:outline focus-visible:outline-2' : 'cursor-default'}
      `}
    >
      {Icon
        ? <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.5} className="shrink-0" />
        : <span
            className="rounded-full shrink-0"
            style={{ backgroundColor: text, width: size === 'sm' ? 6 : 7, height: size === 'sm' ? 6 : 7 }}
          />
      }
      {status.name}
    </button>
  )
}

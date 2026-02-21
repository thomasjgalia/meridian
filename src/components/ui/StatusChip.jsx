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
      <span
        className="rounded-full shrink-0"
        style={{ backgroundColor: text, width: size === 'sm' ? 6 : 7, height: size === 'sm' ? 6 : 7 }}
      />
      {status.name}
    </button>
  )
}

// Deterministic color from a display name
const PALETTE = ['#0D9488', '#7C3AED', '#3B82F6', '#F59E0B', '#EC4899', '#EF4444']

function colorFor(name = '') {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PALETTE[hash % PALETTE.length]
}

function initials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Avatar — shows a user's initials in a colored circle.
 * Renders nothing if user is null/undefined.
 */
export default function Avatar({ user, size = 22, className = '' }) {
  if (!user) return null

  const bg   = colorFor(user.displayName)
  const text = '#fff'

  return (
    <span
      title={user.displayName}
      style={{
        width:           size,
        height:          size,
        backgroundColor: bg,
        color:           text,
        fontSize:        Math.round(size * 0.42),
      }}
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none ${className}`}
    >
      {initials(user.displayName)}
    </span>
  )
}

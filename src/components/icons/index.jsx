// src/components/icons/index.jsx
// Meridian Icon Set — geometric stroke-based, currentColor, scalable

export const IconLighthouse = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Base / foundation */}
    <path d="M 22 58 L 42 58" strokeWidth="3"/>
    <path d="M 23 58 L 20 53 L 44 53 L 41 58" strokeWidth="2"/>
    {/* Tower body — tapered */}
    <path d="M 26 53 L 27.5 20 L 36.5 20 L 38 53" strokeWidth="2.5"/>
    {/* Single mid stripe */}
    <line x1="26.5" y1="38" x2="37.5" y2="38" strokeWidth="1.5"/>
    {/* Lantern room gallery */}
    <rect x="25" y="14" width="14" height="6" rx="1" strokeWidth="2"/>
    {/* Roof peak */}
    <path d="M 25 14 L 32 7 L 39 14" strokeWidth="2"/>
    {/* Light rays — projecting right */}
    <line x1="39" y1="15" x2="54" y2="10" strokeWidth="1.5" opacity="0.7"/>
    <line x1="39" y1="17" x2="56" y2="17" strokeWidth="1.5" opacity="0.5"/>
    <line x1="39" y1="19" x2="54" y2="24" strokeWidth="1.5" opacity="0.3"/>
    {/* Door */}
    <path d="M 30 53 L 30 46 A 2 2 0 0 1 34 46 L 34 53" strokeWidth="1.5"/>
  </svg>
)

export const IconSextant = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <g transform="rotate(-25, 32, 32)">
      <line x1="32" y1="8"  x2="8"  y2="54" strokeWidth="2.5"/>
      <line x1="32" y1="8"  x2="56" y2="54" strokeWidth="2.5"/>
      <line x1="32" y1="8"  x2="32" y2="54" strokeWidth="2"/>
      <path d="M 8 54 A 34 34 0 0 1 56 54"   strokeWidth="3"/>
      <circle cx="32" cy="8"  r="2.5" fill="currentColor" strokeWidth="1.5"/>
      <circle cx="32" cy="54" r="3.5" strokeWidth="1.5"/>
    </g>
  </svg>
)

export const IconArc = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M 8 48 A 28 28 0 0 1 56 48" strokeWidth="4"/>
  </svg>
)

export const IconEpisode = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Dish ellipse */}
    <ellipse cx="32" cy="36" rx="18" ry="6" transform="rotate(-40 32 36)" strokeWidth="3.5"/>
    {/* Convex back curve */}
    <path d="M 18 48 Q 32 56 46 24" strokeWidth="2.5"/>
    {/* Center hub dot */}
    <circle cx="32" cy="36" r="2.5" fill="currentColor" strokeWidth="1.5"/>
    {/* Stand */}
    <line x1="32" y1="52" x2="32" y2="62" strokeWidth="3"/>
    {/* Base */}
    <line x1="22" y1="62" x2="42" y2="62" strokeWidth="3"/>
    {/* Concentric wave arcs */}
    <path d="M 26 28 A 8 8 0 0 1 40 30" strokeWidth="1.5" opacity="0.7" transform="rotate(-45 32 36)"/>
    <path d="M 20 22 A 14 14 0 0 1 46 25" strokeWidth="1.5" opacity="0.4" transform="rotate(-45 32 36)"/>
  </svg>
)

export const IconSignal = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="4,32 14,32 20,16 26,48 32,24 38,40 44,32 60,32" strokeWidth="3.5"/>
  </svg>
)

export const IconRelay = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="14,16 28,32 14,48" strokeWidth="3.5"/>
    <polyline points="26,16 40,32 26,48" strokeWidth="3.5"/>
    <polyline points="38,16 52,32 38,48" strokeWidth="3.5"/>
  </svg>
)

// Map item type to its icon component
export const TYPE_ICONS = {
  arc:     IconArc,
  episode: IconEpisode,
  signal:  IconSignal,
  relay:   IconRelay,
}

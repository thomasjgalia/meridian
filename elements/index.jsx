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
    <path d="M 18 58 L 46 58" strokeWidth="3"/>
    <path d="M 20 58 L 16 52 L 48 52 L 44 58" strokeWidth="2"/>

    {/* Tower body — tapered */}
    <path d="M 22 52 L 24 20 L 40 20 L 42 52" strokeWidth="2.5"/>

    {/* Tower center stripe — single band */}
    <line x1="23.5" y1="38" x2="40.5" y2="38" strokeWidth="1.5"/>

    {/* Lantern room gallery rail */}
    <rect x="22" y="14" width="20" height="6" rx="1" strokeWidth="2"/>

    {/* Lantern cap / roof */}
    <path d="M 22 14 L 32 6 L 42 14" strokeWidth="2"/>

    {/* Light beam — two rays emanating left and right */}
    <line x1="22" y1="17" x2="10" y2="12" strokeWidth="1.5" opacity="0.6"/>
    <line x1="42" y1="17" x2="54" y2="12" strokeWidth="1.5" opacity="0.6"/>

    {/* Door at base of tower */}
    <path d="M 29 52 L 29 44 A 3 3 0 0 1 35 44 L 35 52" strokeWidth="1.5"/>
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
    <path d="M 8 48 A 28 28 0 0 1 56 48" strokeWidth="2.5"/>
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
    <circle cx="32" cy="32" r="24" strokeWidth="2.5"/>
    <path d="M 32 32 L 32 8 A 24 24 0 0 1 56 32 Z" fill="currentColor" stroke="none"/>
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
    <polyline points="4,32 14,32 20,16 26,48 32,24 38,40 44,32 60,32" strokeWidth="2.5"/>
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
    <polyline points="14,16 28,32 14,48" strokeWidth="2.5"/>
    <polyline points="26,16 40,32 26,48" strokeWidth="2.5"/>
    <polyline points="38,16 52,32 38,48" strokeWidth="2.5"/>
  </svg>
)

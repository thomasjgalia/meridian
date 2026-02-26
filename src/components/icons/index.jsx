// src/components/icons/index.jsx
// Meridian Icon Set — custom icons (Lighthouse, Sextant) + Lucide type icons

import { SatelliteDish, RadioTower, SplinePointer, ChevronsRight } from 'lucide-react'

// Type icons — Lucide icons mapped to Meridian work item types
export const IconArc     = SplinePointer   // arc
export const IconEpisode = SatelliteDish   // episode
export const IconSignal  = RadioTower      // signal
export const IconRelay   = ChevronsRight   // relay

// Map item type → icon component
export const TYPE_ICONS = {
  arc:     IconArc,
  episode: IconEpisode,
  signal:  IconSignal,
  relay:   IconRelay,
}

export const IconLighthouse = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Base / foundation */}
    <path d="M 8.25 21.75 L 15.75 21.75" strokeWidth="1.5"/>
    <path d="M 8.625 21.75 L 7.5 19.875 L 16.5 19.875 L 15.375 21.75" strokeWidth="1"/>
    {/* Tower body — tapered */}
    <path d="M 9.75 19.875 L 10.3125 7.5 L 13.6875 7.5 L 14.25 19.875" strokeWidth="1"/>
    {/* Single mid stripe */}
    <line x1="9.9375" y1="14.25" x2="14.0625" y2="14.25" strokeWidth="0.75"/>
    {/* Lantern room gallery */}
    <rect x="9.375" y="5.25" width="5.25" height="2.25" rx="0.375" strokeWidth="1"/>
    {/* Roof peak */}
    <path d="M 9.375 5.25 L 12 2.625 L 14.625 5.25" strokeWidth="1"/>
    {/* Light rays — projecting right */}
    <line x1="14.625" y1="5.625" x2="20.25" y2="3.75" strokeWidth="0.75" opacity="0.7"/>
    <line x1="14.625" y1="6.375" x2="21" y2="6.375" strokeWidth="0.75" opacity="0.5"/>
    <line x1="14.625" y1="7.125" x2="20.25" y2="9" strokeWidth="0.75" opacity="0.3"/>
    {/* Door */}
    <path d="M 11.25 19.875 L 11.25 17.25 A 0.75 0.75 0 0 1 12.75 17.25 L 12.75 19.875" strokeWidth="0.75"/>
  </svg>
)

export const IconSextant = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <g transform="rotate(-25, 12, 12)">
      <line x1="12" y1="3"  x2="3"  y2="20.25" strokeWidth="1.25"/>
      <line x1="12" y1="3"  x2="21" y2="20.25" strokeWidth="1.25"/>
      <line x1="12" y1="3"  x2="12" y2="20.25" strokeWidth="1"/>
      <path d="M 3 20.25 A 12.75 12.75 0 0 1 21 20.25" strokeWidth="1.5"/>
      <circle cx="12" cy="3"     r="1"    fill="currentColor" strokeWidth="0.75"/>
      <circle cx="12" cy="20.25" r="1.25" strokeWidth="0.75"/>
    </g>
  </svg>
)


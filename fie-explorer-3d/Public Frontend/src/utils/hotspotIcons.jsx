/**
 * hotspotIcons.jsx — iconos por tipo de hotspot (trazo, color heredado).
 */
import React from 'react';

export default function HotspotTypeIcon({ type, size = 14, strokeWidth = 2 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flexShrink: 0, display: 'block' },
    'aria-hidden': true,
  };

  switch (type) {
    case 'classroom':
      return <svg {...props}><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" /></svg>;
    case 'lab':
      return <svg {...props}><path d="M9 3h6m-3 0v5.5L16.5 17H7.5L12 8.5V3" /><path d="M6.5 17.5h11" /></svg>;
    case 'office':
      return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10M7 12h7M7 16h4" /></svg>;
    case 'access':
      return <svg {...props}><path d="M13 4h6v16h-6" /><path d="M8 16l-4-4 4-4M4 12h10" /></svg>;
    case 'service':
    default:
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>;
  }
}

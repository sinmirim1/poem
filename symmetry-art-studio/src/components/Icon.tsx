/** 단순한 선 그림 아이콘 (24×24) */
import type { ReactNode } from 'react';

const I: Record<string, ReactNode> = {
  select: <path d="M5 3l14 8-6 1.5L10 19z" fill="currentColor" stroke="none" />,
  move: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </>
  ),
  rotate: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </>
  ),
  scale: (
    <>
      <rect x="3" y="11" width="10" height="10" rx="1" />
      <path d="M14 3h7v7M21 3l-8 8" />
    </>
  ),
  pan: (
    <>
      <path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L8 13" />
    </>
  ),
  point: <circle cx="12" cy="12" r="4" fill="currentColor" />,
  segment: (
    <>
      <path d="M5 19L19 5" />
      <circle cx="5" cy="19" r="2" fill="currentColor" />
      <circle cx="19" cy="5" r="2" fill="currentColor" />
    </>
  ),
  line: (
    <>
      <path d="M2 22L22 2" />
      <circle cx="8" cy="16" r="2" fill="currentColor" />
      <circle cx="16" cy="8" r="2" fill="currentColor" />
    </>
  ),
  triangle: <path d="M12 4l9 16H3z" />,
  rect: <rect x="4" y="6" width="16" height="12" />,
  polygon: <path d="M12 3l9 6.5-3.5 10.5h-11L3 9.5z" />,
  circle: <circle cx="12" cy="12" r="8.5" />,
  freehand: <path d="M3 17c3-6 5-9 7-6s1 7 4 5 4-9 7-10" />,
  text: (
    <text x="12" y="17.5" fontSize="15" fontWeight="900" textAnchor="middle" fill="currentColor" stroke="none">
      가
    </text>
  ),
  bubble: <path d="M4 5h16v10H10l-5 4v-4H4z" />,
  axisV: (
    <>
      <path d="M12 2v20" strokeDasharray="2.5 2.5" />
      <path d="M10 7L4 17h6zM14 7l6 10h-6z" />
    </>
  ),
  axisH: (
    <>
      <path d="M2 12h20" strokeDasharray="2.5 2.5" />
      <path d="M7 10L17 4v6zM7 14l10 6v-6z" />
    </>
  ),
  axisDraw: (
    <>
      <path d="M4 20L20 4" strokeDasharray="2.5 2.5" />
      <path d="M17 4h3v3" />
    </>
  ),
  center: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3v18M3 12h18" />
    </>
  ),
  mirrorLine: (
    <>
      <path d="M12 2v20" strokeDasharray="2.5 2.5" />
      <path d="M9 6L3 18h6z" fill="currentColor" fillOpacity="0.25" />
      <path d="M15 6l6 12h-6z" />
    </>
  ),
  mirrorPoint: (
    <>
      <path d="M4 4h7l-7 7z" fill="currentColor" fillOpacity="0.25" />
      <path d="M20 20h-7l7-7z" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V5a1 1 0 0 1 1-1h11" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h3" />
    </>
  ),
  front: (
    <>
      <rect x="3" y="3" width="11" height="11" rx="1" strokeDasharray="2 2" />
      <rect x="10" y="10" width="11" height="11" rx="1" fill="currentColor" fillOpacity="0.3" />
    </>
  ),
  back: (
    <>
      <rect x="3" y="3" width="11" height="11" rx="1" fill="currentColor" fillOpacity="0.3" />
      <rect x="10" y="10" width="11" height="11" rx="1" strokeDasharray="2 2" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-5-5M8 11h6M11 8v6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-5-5M8 11h6" />
    </>
  ),
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  grid: <path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18" />,
  magnet: <path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3zM6 7h4M14 7h4" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  warn: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14M12 17v.5" />
    </>
  ),
  teacher: (
    <>
      <circle cx="8" cy="7" r="3" />
      <path d="M2 21v-3a5 5 0 0 1 10 0v3M14 4h8v9h-8M16 8h4" />
    </>
  ),
  fullscreen: <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />,
  home: <path d="M3 11l9-8 9 8M5 9v12h14V9" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  print: (
    <>
      <path d="M6 9V3h12v6M6 18H3v-8h18v8h-3" />
      <rect x="6" y="14" width="12" height="7" />
    </>
  ),
  sparkle: <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />,
  split: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 3v16M12 13l-6 6M12 13l6 6" />
    </>
  ),
  scatter: (
    <>
      <path d="M3 5l6-1 1 6-6 1zM14 3l6 3-3 5-5-3zM8 14l7 1-2 6-6-2z" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  unlink: <path d="M15 12l3.5-3.5a3.5 3.5 0 0 0-5-5L10 7M9 12l-3.5 3.5a3.5 3.5 0 0 0 5 5L14 17M4 4l16 16" />,
  flipH: (
    <>
      <path d="M12 2v20" strokeDasharray="2 2" />
      <path d="M9 6L3 18h6zM15 6l6 12h-6z" />
    </>
  ),
  flipV: (
    <>
      <path d="M2 12h20" strokeDasharray="2 2" />
      <path d="M6 9L18 3v6zM6 15l12 6v-6z" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5L5 19" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-2 2-2h2a4 4 0 0 0 4-4c0-4.4-4-7.5-9-7.5z" />
      <circle cx="7.5" cy="11" r="1.3" fill="currentColor" />
      <circle cx="10" cy="7" r="1.3" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.3" fill="currentColor" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-5-5" />
    </>
  ),
  star: <path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z" />,
  multi: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
      <path d="M15 5h4v4M5 15v4h4" />
    </>
  ),
  stretch: <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4M7 9h10v6H7z" />,
  skew: <path d="M8 5h12l-4 14H4z" />,
  contrast: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </>
  ),
  brush: <path d="M18 3l3 3-9 9-3-3zM9 12c-3 0-5 2-5 5 0 2-1 3-2 4 4 0 9-1 9-6" />,
  shadow: (
    <>
      <rect x="4" y="3" width="12" height="12" rx="2" />
      <path d="M8 19h12V7" strokeOpacity="0.5" />
    </>
  ),
  outline: <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="4" />,
  opacity: (
    <>
      <circle cx="9" cy="12" r="6" fill="currentColor" fillOpacity="0.35" />
      <circle cx="15" cy="12" r="6" />
    </>
  ),
  repeat: <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />,
  bigger: <path d="M4 20l6-6M4 20v-5M4 20h5M20 4l-6 6M20 4v5M20 4h-5" />,
  smaller: <path d="M10 14l-6 6M10 14v5M10 14H5M14 10l6-6M14 10V5M14 10h5" />,
  angle: <path d="M4 20h16M4 20L16 6M9 20a5 5 0 0 0-1.6-3.8" />,
  coords: <path d="M4 4v16h16M8 16l4-6 3 3 4-7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
};

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {I[name] ?? I.info}
    </svg>
  );
}

/**
 * 작품 그리기 (편집 화면, 작은 예시 그림, PNG 저장, 인쇄에서 모두 같은 코드를 쓴다)
 */
import { memo, type ReactNode } from 'react';
import type { Background, Doc, Shape } from '../../types';
import { PAPER, bubblePath, extendedLine, polyPath, smoothPath, textBox } from '../../geometry/shapes';
import { dist } from '../../geometry/vec';
import { POP_CELL_BG, POP_HUES } from '../../data/artStyles';

export const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";

/** 붓터치·그림자·팝아트 색 바꾸기 필터 */
export function ArtDefs({ prefix }: { prefix: string }) {
  return (
    <>
      <filter id={`${prefix}-brush`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id={`${prefix}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="18" stdDeviation="10" floodColor="#000" floodOpacity="0.32" />
      </filter>
      {POP_HUES.map((h, i) => (
        <filter key={i} id={`${prefix}-hue${i}`}>
          <feColorMatrix type="hueRotate" values={String(h)} />
        </filter>
      ))}
      <clipPath id={`${prefix}-paper`}>
        <rect x="0" y="0" width={PAPER.w} height={PAPER.h} />
      </clipPath>
    </>
  );
}

/** 배경 */
export function BackgroundLayer({ bg, prefix }: { bg: Background; prefix: string }) {
  const { w, h } = PAPER;
  const id = (n: string) => `${prefix}-bg-${n}`;
  switch (bg.type) {
    case 'solid':
      return <rect width={w} height={h} fill={bg.c1} />;
    case 'linear':
      return (
        <>
          <defs>
            <linearGradient id={id('lin')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={bg.c1} />
              <stop offset="1" stopColor={bg.c2} />
            </linearGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${id('lin')})`} />
        </>
      );
    case 'radial':
      return (
        <>
          <defs>
            <radialGradient id={id('rad')} cx="0.5" cy="0.5" r="0.75">
              <stop offset="0" stopColor={bg.c1} />
              <stop offset="1" stopColor={bg.c2} />
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${id('rad')})`} />
        </>
      );
    case 'dots':
      return (
        <>
          <defs>
            <pattern id={id('dots')} width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="7" cy="7" r="6" fill={bg.c2} />
              <circle cx="21" cy="21" r="6" fill={bg.c2} />
            </pattern>
          </defs>
          <rect width={w} height={h} fill={bg.c1} />
          <rect width={w} height={h} fill={`url(#${id('dots')})`} />
        </>
      );
    case 'stripes':
      return (
        <>
          <defs>
            <pattern id={id('str')} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="24" height="48" fill={bg.c2} />
            </pattern>
          </defs>
          <rect width={w} height={h} fill={bg.c1} />
          <rect width={w} height={h} fill={`url(#${id('str')})`} />
        </>
      );
    case 'checker':
      return (
        <>
          <defs>
            <pattern id={id('chk')} width="120" height="120" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill={bg.c2} />
              <rect x="60" y="60" width="60" height="60" fill={bg.c2} />
            </pattern>
          </defs>
          <rect width={w} height={h} fill={bg.c1} />
          <rect width={w} height={h} fill={`url(#${id('chk')})`} />
        </>
      );
    case 'clouds':
      return (
        <>
          <defs>
            <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={bg.c1} />
              <stop offset="1" stopColor={bg.c2} />
            </linearGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${id('sky')})`} />
          {[
            [220, 160, 1],
            [760, 110, 1.3],
            [1220, 220, 0.9],
            [420, 520, 0.8],
            [1080, 640, 1.1],
          ].map(([x, y, k], i) => (
            <g key={i} fill="#fff" opacity="0.92" transform={`translate(${x} ${y}) scale(${k})`}>
              <ellipse cx="0" cy="0" rx="90" ry="40" />
              <ellipse cx="-50" cy="-10" rx="50" ry="40" />
              <ellipse cx="40" cy="-25" rx="60" ry="48" />
            </g>
          ))}
        </>
      );
    case 'night': {
      const stars = Array.from({ length: 70 }, (_, i) => {
        const x = (i * 197.3) % w;
        const y = (i * 131.7 + (i % 7) * 53) % h;
        return <circle key={i} cx={x} cy={y} r={(i % 3) + 1.2} fill="#fff" opacity={0.5 + (i % 5) / 10} />;
      });
      return (
        <>
          <defs>
            <linearGradient id={id('night')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={bg.c1} />
              <stop offset="1" stopColor={bg.c2} />
            </linearGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${id('night')})`} />
          {stars}
        </>
      );
    }
    case 'floor': {
      // 초현실주의 그림에 자주 나오는, 끝없이 멀어지는 바둑판 바닥
      const horizon = h * 0.56;
      const vp = w / 2;
      const rows = 9;
      const cols = 18;
      const ys = Array.from({ length: rows + 1 }, (_, r) => horizon + (h - horizon) * (r / rows) ** 1.7);
      const xAt = (c: number, y: number) => {
        const bottomX = vp + (c - cols / 2) * ((w * 2.2) / cols);
        return vp + (bottomX - vp) * ((y - horizon) / (h - horizon));
      };
      const tiles: ReactNode[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2) continue;
          const y0 = ys[r];
          const y1 = ys[r + 1];
          tiles.push(
            <polygon
              key={`${r}-${c}`}
              points={`${xAt(c, y0)},${y0} ${xAt(c + 1, y0)},${y0} ${xAt(c + 1, y1)},${y1} ${xAt(c, y1)},${y1}`}
              fill={bg.c2}
            />,
          );
        }
      }
      return (
        <>
          <defs>
            <linearGradient id={id('floorsky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={bg.c1} />
              <stop offset="1" stopColor="#FCEBD2" />
            </linearGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#${id('floorsky')})`} />
          <rect y={horizon} width={w} height={h - horizon} fill="#F6EEDF" />
          {tiles}
        </>
      );
    }
  }
}

/** 도형 하나 그리기 */
export function ShapeView({ s, prefix }: { s: Shape; prefix: string }) {
  const p0 = s.points[0];
  if (!p0) return null;
  const dash = s.lineStyle === 'dashed' ? `${s.strokeWidth * 3} ${s.strokeWidth * 2}` : undefined;
  const brush = s.lineStyle === 'brush';
  const stroke = {
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    strokeDasharray: dash,
  };
  let el: ReactNode = null;
  switch (s.kind) {
    case 'point':
      el = <circle cx={p0.x} cy={p0.y} r={Math.max(5, s.strokeWidth * 1.6)} fill={s.stroke} />;
      break;
    case 'circle':
      el = <circle cx={p0.x} cy={p0.y} r={dist(p0, s.points[1] ?? p0)} fill={s.fill} {...stroke} />;
      break;
    case 'segment':
      el = <path d={polyPath(s.points, false)} fill="none" {...stroke} />;
      break;
    case 'line': {
      const [a, b] = extendedLine(s.points[0], s.points[1] ?? s.points[0]);
      el = <path d={polyPath([a, b], false)} fill="none" {...stroke} />;
      break;
    }
    case 'freehand': {
      // 채우기 색이 있으면 시작점과 끝점을 이어 닫힌 도형으로 칠한다
      const filled = s.fill !== 'none';
      el = <path d={smoothPath(s.points) + (filled ? ' Z' : '')} fill={filled ? s.fill : 'none'} {...stroke} />;
      break;
    }
    case 'triangle':
    case 'rect':
    case 'polygon':
      el = <path d={polyPath(s.points, true)} fill={s.fill} {...stroke} />;
      break;
    case 'text':
      el = (
        <text
          x={p0.x}
          y={p0.y}
          fontSize={s.fontSize ?? 40}
          fontFamily={FONT}
          fontWeight={900}
          textAnchor="middle"
          dominantBaseline="central"
          fill={s.fill === 'none' ? s.stroke : s.fill}
          stroke={s.stroke}
          strokeWidth={Math.min(s.strokeWidth, (s.fontSize ?? 40) / 8)}
          paintOrder="stroke"
          strokeLinejoin="round"
          transform={s.rotation ? `rotate(${s.rotation} ${p0.x} ${p0.y})` : undefined}
        >
          {s.text}
        </text>
      );
      break;
    case 'bubble': {
      const { w, h } = textBox(s);
      el = (
        <g transform={`translate(${p0.x} ${p0.y})${s.rotation ? ` rotate(${s.rotation})` : ''}`}>
          <path d={bubblePath(w, h)} fill={s.fill === 'none' ? '#fff' : s.fill} {...stroke} />
          <text
            x={0}
            y={0}
            fontSize={s.fontSize ?? 40}
            fontFamily={FONT}
            fontWeight={900}
            textAnchor="middle"
            dominantBaseline="central"
            fill={s.stroke}
          >
            {s.text}
          </text>
        </g>
      );
      break;
    }
  }
  return (
    <g opacity={s.opacity} filter={s.shadow ? `url(#${prefix}-shadow)` : undefined}>
      {brush ? <g filter={`url(#${prefix}-brush)`}>{el}</g> : el}
    </g>
  );
}

/** 도형 전체 (자주 다시 그리지 않도록 memo) */
export const ShapesLayer = memo(function ShapesLayer({ shapes, prefix }: { shapes: Shape[]; prefix: string }) {
  return (
    <>
      {shapes.map((s) => (
        <ShapeView key={s.id} s={s} prefix={prefix} />
      ))}
    </>
  );
});

/**
 * 배경 + 도형 (도화지 크기로 잘라서)
 * tiled: 팝아트 반복 배치(2×2, 3×3)를 실제로 그릴지
 */
export function ArtworkContent({ doc, prefix, tiled }: { doc: Doc; prefix: string; tiled: boolean }) {
  const n = doc.popGrid;
  if (!tiled || n === 1) {
    return (
      <g clipPath={`url(#${prefix}-paper)`}>
        <BackgroundLayer bg={doc.background} prefix={prefix} />
        <ShapesLayer shapes={doc.shapes} prefix={prefix} />
      </g>
    );
  }
  const cells: ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const k = r * n + c;
      cells.push(
        <g key={k} transform={`translate(${(c * PAPER.w) / n} ${(r * PAPER.h) / n}) scale(${1 / n})`}>
          <g clipPath={`url(#${prefix}-paper)`}>
            {k === 0 ? (
              <BackgroundLayer bg={doc.background} prefix={`${prefix}-c${k}`} />
            ) : (
              <rect width={PAPER.w} height={PAPER.h} fill={POP_CELL_BG[k % POP_CELL_BG.length]} />
            )}
            <g filter={k === 0 ? undefined : `url(#${prefix}-hue${k % POP_HUES.length})`}>
              <ShapesLayer shapes={doc.shapes} prefix={prefix} />
            </g>
          </g>
          <rect width={PAPER.w} height={PAPER.h} fill="none" stroke="#111" strokeWidth={10} />
        </g>,
      );
    }
  }
  return <g clipPath={`url(#${prefix}-paper)`}>{cells}</g>;
}

/** 따로 떨어진 작품 그림 (예시 그림, 설명 쓰기, 인쇄, 저장) */
export function ArtworkSvg({ doc, prefix, className, title }: { doc: Doc; prefix: string; className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${PAPER.w} ${PAPER.h}`}
      width={PAPER.w}
      height={PAPER.h}
      className={className}
      role="img"
      aria-label={title ?? '작품 그림'}
    >
      <defs>
        <ArtDefs prefix={prefix} />
      </defs>
      <ArtworkContent doc={doc} prefix={prefix} tiled />
    </svg>
  );
}

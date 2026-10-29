/**
 * 작품 위에 겹쳐 그리는 도우미 그림
 *  - 대칭축(파란 점선), 대칭의 중심(보라 십자)
 *  - 원본·복사본 구분 표시
 *  - 학습 모드: 대응점·대응변·수직·같은 거리 표시
 *  - 고른 도형의 테두리와 손잡이, 그리는 중인 도형 미리보기
 * 모든 크기는 화면에서 같은 크기로 보이도록 확대 배율(z)로 나눈다.
 */
import type { ReactNode, SVGProps } from 'react';
import type { Doc, DrawStyle, OwnSymmetry, Settings, Shape, SymFigure, ToolId, Vec } from '../../types';
import {

  extendedLine,
  hasVertexHandles,
  interiorAngles,
  isPolygonKind,
  polyPath,
  shapeBounds,
  shapeEdges,
  smoothPath,
} from '../../geometry/shapes';
import { add, boxOf, dist, dot, footOnLine, lineAngleForDisplay, mid, mul, norm, sub, unionBox, vec, type Box } from '../../geometry/vec';
import { POINT_NAMES, figNumText, sampleIndices } from '../../geometry/symmetry';
import { FONT } from '../art/Artwork';

export const AXIS_COLOR = '#2F6FED';
export const CENTER_COLOR = '#8B3DFF';
const SEL_COLOR = '#0E7C66';
const WARN_COLOR = '#E5484D';
const OWN_COLOR = '#F08C00';
const EDGE_COLORS = ['#E4572E', '#17BEBB', '#F4B400', '#76B041', '#9C6ADE', '#F28482', '#3A86FF', '#8D6E63'];

export type Live =
  | { kind: 'draw'; tool: ToolId; a: Vec; b: Vec; pts?: Vec[] }
  | { kind: 'marquee'; a: Vec; b: Vec }
  | null;

/** 글자가 들어간 작은 이름표 */
function Pill({ at, text, z, color = '#1d2a4d', bg = '#ffffff', size = 14 }: { at: Vec; text: string; z: number; color?: string; bg?: string; size?: number }) {
  const fs = size / z;
  let units = 0;
  for (const ch of text) units += ch.charCodeAt(0) > 0x1100 ? 1 : 0.6;
  const w = units * fs + fs * 0.9;
  const h = fs * 1.55;
  return (
    <g pointerEvents="none">
      <rect x={at.x - w / 2} y={at.y - h / 2} width={w} height={h} rx={h / 2} fill={bg} stroke={color} strokeWidth={1.2 / z} opacity={0.95} />
      <text x={at.x} y={at.y} fontSize={fs} fontFamily={FONT} fontWeight={800} fill={color} textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
  );
}

/** 도형의 테두리 모양만 (구분 표시·대응변 등에 사용) */
function Outline({ s, z, ...rest }: { s: Shape; z: number } & SVGProps<SVGPathElement>) {
  if (s.kind === 'circle') {
    return <circle cx={s.points[0].x} cy={s.points[0].y} r={dist(s.points[0], s.points[1] ?? s.points[0])} fill="none" {...(rest as SVGProps<SVGCircleElement>)} />;
  }
  if (s.kind === 'point') {
    return <circle cx={s.points[0].x} cy={s.points[0].y} r={11 / z} fill="none" {...(rest as SVGProps<SVGCircleElement>)} />;
  }
  if (s.kind === 'text' || s.kind === 'bubble') {
    const b = shapeBounds(s);
    return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" {...(rest as SVGProps<SVGRectElement>)} />;
  }
  let d = '';
  if (s.kind === 'line') d = polyPath(extendedLine(s.points[0], s.points[1] ?? s.points[0], 3000), false);
  else if (s.kind === 'freehand') d = smoothPath(s.points);
  else d = polyPath(s.points, isPolygonKind(s.kind));
  return <path d={d} fill="none" {...rest} />;
}

/** 대칭 도형의 대칭축을 도형 근처 길이로만 그린다 */
function figureAxisSegment(fig: SymFigure, members: Shape[]): [Vec, Vec] | null {
  if (!fig.axis) return null;
  const [a, b] = fig.axis;
  const d = norm(sub(b, a));
  const box = unionBox(members.map(shapeBounds));
  const corners = [vec(box.x, box.y), vec(box.x + box.w, box.y), vec(box.x, box.y + box.h), vec(box.x + box.w, box.y + box.h)];
  const ts = corners.map((c) => dot(sub(c, a), d));
  const t0 = Math.min(...ts) - 50;
  const t1 = Math.max(...ts) + 50;
  return [add(a, mul(d, t0)), add(a, mul(d, t1))];
}

function CenterMark({ p, z, color = CENTER_COLOR, active = false }: { p: Vec; z: number; color?: string; active?: boolean }) {
  const r = 7 / z;
  return (
    <g pointerEvents="none">
      {active && <circle cx={p.x} cy={p.y} r={r * 2.2} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5 / z} />}
      <circle cx={p.x} cy={p.y} r={r} fill="#fff" stroke={color} strokeWidth={3 / z} />
      <path d={`M${p.x - r * 1.8} ${p.y}H${p.x + r * 1.8}M${p.x} ${p.y - r * 1.8}V${p.y + r * 1.8}`} stroke={color} strokeWidth={2.4 / z} />
      <circle cx={p.x} cy={p.y} r={r * 0.35} fill={color} />
    </g>
  );
}

/** 선분 가운데에 작은 눈금(같은 길이 표시) */
function Tick({ a, b, z, count = 1, color = '#1d2a4d' }: { a: Vec; b: Vec; z: number; count?: number; color?: string }) {
  const m = mid(a, b);
  const d = norm(sub(b, a));
  const n = vec(-d.y, d.x);
  const s = 7 / z;
  const gap = 4 / z;
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const c = add(m, mul(d, (i - (count - 1) / 2) * gap));
    out.push(<path key={i} d={`M${c.x - n.x * s} ${c.y - n.y * s}L${c.x + n.x * s} ${c.y + n.y * s}`} stroke={color} strokeWidth={2 / z} />);
  }
  return <g pointerEvents="none">{out}</g>;
}

interface Props {
  doc: Doc;
  z: number;
  tool: ToolId;
  settings: Settings;
  selection: string[];
  group: Set<string>;
  activeAxisId: string | null;
  activeCenterId: string | null;
  guideSel: { kind: 'axis' | 'center'; id: string } | null;
  ownSym: OwnSymmetry | null;
  brokenFigs: Set<string>;
  live: Live;
  draft: Vec[];
  hover: Vec | null;
  snapLabel: string | null;
  measure: { text: string; at: Vec } | null;
  drawStyle: DrawStyle;
}

export function Overlays(p: Props) {
  const { doc, z, settings } = p;
  const byId = new Map(doc.shapes.map((s) => [s.id, s]));
  const selSet = new Set(p.selection);
  const out: ReactNode[] = [];
  const cell = (px: number) => Math.round((px / settings.gridSize) * 10) / 10;

  // ── 1. 도화지 위에 놓아 둔 대칭축·중심 도구 ──
  const guides: ReactNode[] = [];
  if (settings.showAxes) {
    for (const ax of doc.axes) {
      const [a, b] = extendedLine(ax.p1, ax.p2, 4000);
      const active = ax.id === p.activeAxisId;
      const selected = p.guideSel?.kind === 'axis' && p.guideSel.id === ax.id;
      guides.push(
        <g key={ax.id}>
          <path d={polyPath([a, b], false)} stroke="transparent" strokeWidth={18 / z} data-guide="axis" data-id={ax.id} style={{ cursor: 'grab' }} />
          <path
            d={polyPath([a, b], false)}
            stroke={AXIS_COLOR}
            strokeWidth={(active ? 3.5 : 2) / z}
            strokeDasharray={`${12 / z} ${8 / z}`}
            pointerEvents="none"
            opacity={active ? 1 : 0.6}
          />
        </g>,
      );
      if (selected) {
        for (const [i, q] of [ax.p1, ax.p2].entries()) {
          guides.push(
            <circle key={`${ax.id}-e${i}`} cx={q.x} cy={q.y} r={10 / z} fill="#fff" stroke={AXIS_COLOR} strokeWidth={3 / z} data-handle="axisEnd" data-id={ax.id} data-end={i} style={{ cursor: 'crosshair' }} />,
          );
        }
      }
    }
  }
  if (settings.showCenters) {
    for (const c of doc.centers) {
      const active = c.id === p.activeCenterId;
      guides.push(
        <g key={c.id}>
          <circle cx={c.p.x} cy={c.p.y} r={16 / z} fill="transparent" data-guide="center" data-id={c.id} style={{ cursor: 'grab' }} />
          <CenterMark p={c.p} z={z} active={active} />
        </g>,
      );
    }
  }
  out.push(
    <g key="guides" clipPath="url(#ed-paper)">
      {guides}
    </g>,
  );
  // 활성 대칭축 이름표
  const activeAxis = doc.axes.find((a) => a.id === p.activeAxisId);
  if (activeAxis && settings.showAxes) {
    out.push(<Pill key="axis-label" at={add(mid(activeAxis.p1, activeAxis.p2), vec(0, 0))} text="대칭축" z={z} color={AXIS_COLOR} />);
  }

  // ── 2. 원본·복사본 구분 표시 ──
  if (settings.copyMarks) {
    for (const fig of doc.figures) {
      const color = p.brokenFigs.has(fig.id) ? WARN_COLOR : fig.type === 'line' ? AXIS_COLOR : CENTER_COLOR;
      const tag = `${fig.type === 'line' ? '선' : '점'}${figNumText(fig.num)}`;
      const copies = fig.pairs.map((q) => byId.get(q.copy)).filter(Boolean) as Shape[];
      const origs = fig.pairs.map((q) => byId.get(q.orig)).filter(Boolean) as Shape[];
      for (const c of copies) {
        out.push(<Outline key={`cm-${fig.id}-${c.id}`} s={c} z={z} stroke={color} strokeWidth={2.5 / z} strokeDasharray={`${6 / z} ${5 / z}`} pointerEvents="none" />);
      }
      if (origs.length && copies.length) {
        const ob = unionBox(origs.map(shapeBounds));
        const cb = unionBox(copies.map(shapeBounds));
        const broken = p.brokenFigs.has(fig.id);
        out.push(<Pill key={`tg-o-${fig.id}`} at={vec(ob.x + ob.w / 2, ob.y - 16 / z)} text={`${tag} 원본`} z={z} color={color} size={12} />);
        out.push(<Pill key={`tg-c-${fig.id}`} at={vec(cb.x + cb.w / 2, cb.y - 16 / z)} text={`${tag}′ 복사${broken ? ' ⚠' : ''}`} z={z} color="#fff" bg={color} size={12} />);
      }
    }
  }

  // ── 3. 고른 대칭 도형의 대칭축/중심 + 학습 모드 ──
  const selFigs = doc.figures.filter((f) => f.pairs.some((q) => selSet.has(q.orig) || selSet.has(q.copy)));
  for (const fig of selFigs) {
    const members = fig.pairs.flatMap((q) => [byId.get(q.orig), byId.get(q.copy)]).filter(Boolean) as Shape[];
    if (fig.type === 'line' && settings.showAxes) {
      const seg = figureAxisSegment(fig, members);
      if (seg) {
        out.push(<path key={`fa-${fig.id}`} d={polyPath(seg, false)} stroke={AXIS_COLOR} strokeWidth={3 / z} strokeDasharray={`${12 / z} ${8 / z}`} pointerEvents="none" />);
        out.push(<Pill key={`fal-${fig.id}`} at={seg[0]} text={`${figNumText(fig.num)}의 대칭축`} z={z} color={AXIS_COLOR} size={12} />);
      }
    }
    if (fig.type === 'point' && fig.center && settings.showCenters) {
      out.push(<CenterMark key={`fc-${fig.id}`} p={fig.center} z={z} active />);
      out.push(<Pill key={`fcl-${fig.id}`} at={add(fig.center, vec(0, 30 / z))} text="대칭의 중심" z={z} color={CENTER_COLOR} size={12} />);
    }
  }
  if (settings.learning && selFigs.length) out.push(<Learning key="learn" fig={selFigs[0]} byId={byId} z={z} cell={cell} />);

  // ── 4. 도형 스스로의 대칭 찾기 결과 ──
  if (p.ownSym) {
    p.ownSym.axes.forEach(([a, b], i) => {
      out.push(<path key={`own-${i}`} d={polyPath([a, b], false)} stroke={OWN_COLOR} strokeWidth={3 / z} strokeDasharray={`${14 / z} ${6 / z} ${3 / z} ${6 / z}`} pointerEvents="none" />);
    });
    if (p.ownSym.center) out.push(<CenterMark key="own-c" p={p.ownSym.center} z={z} color={OWN_COLOR} />);
  }

  // ── 5. 고른 도형의 테두리, 각도·좌표, 손잡이 ──
  const selShapes = p.selection.map((id) => byId.get(id)).filter(Boolean) as Shape[];
  for (const s of selShapes) {
    const b = shapeBounds(s);
    const pad = 6 / z;
    out.push(<rect key={`sb-${s.id}`} x={b.x - pad} y={b.y - pad} width={b.w + pad * 2} height={b.h + pad * 2} fill="none" stroke={SEL_COLOR} strokeWidth={2 / z} strokeDasharray={`${5 / z} ${4 / z}`} pointerEvents="none" />);
  }
  if (selShapes.length === 1) {
    const s = selShapes[0];
    if (settings.showAngles) {
      if (isPolygonKind(s.kind)) {
        interiorAngles(s.points).forEach((a, i) => out.push(<Pill key={`ang-${i}`} at={a.at} text={`${a.deg}°`} z={z} color="#B54708" size={12} />));
      } else if (s.kind === 'segment' || s.kind === 'line') {
        out.push(<Pill key="ang-l" at={add(mid(s.points[0], s.points[1]), vec(0, -22 / z))} text={`기울기 ${lineAngleForDisplay(s.points[0], s.points[1])}°`} z={z} color="#B54708" size={12} />);
      }
    }
    if (settings.showCoords && hasVertexHandles(s.kind)) {
      s.points.forEach((q, i) =>
        out.push(<Pill key={`co-${i}`} at={add(q, vec(0, 24 / z))} text={`(${cell(q.x)}, ${cell(q.y)})`} z={z} color="#344054" size={11} />),
      );
    }
  }
  if (selShapes.length && p.tool === 'select') {
    const gb = unionBox(doc.shapes.filter((s) => p.group.has(s.id)).map(shapeBounds));
    const pad = 10 / z;
    const box: Box = { x: gb.x - pad, y: gb.y - pad, w: gb.w + pad * 2, h: gb.h + pad * 2 };
    if (p.group.size > selShapes.length) {
      out.push(<rect key="grp" x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={SEL_COLOR} strokeOpacity={0.5} strokeWidth={1.5 / z} pointerEvents="none" />);
    }
    const top = vec(box.x + box.w / 2, box.y);
    const rot = vec(top.x, top.y - 34 / z);
    out.push(<path key="rot-stem" d={`M${top.x} ${top.y}L${rot.x} ${rot.y}`} stroke={SEL_COLOR} strokeWidth={2 / z} pointerEvents="none" />);
    out.push(<circle key="rot" cx={rot.x} cy={rot.y} r={11 / z} fill="#fff" stroke={SEL_COLOR} strokeWidth={3 / z} data-handle="rotate" style={{ cursor: 'grab' }} />);
    const hs = 18 / z;
    out.push(<rect key="scl" x={box.x + box.w - hs / 2} y={box.y + box.h - hs / 2} width={hs} height={hs} rx={3 / z} fill="#fff" stroke={SEL_COLOR} strokeWidth={3 / z} data-handle="scale" style={{ cursor: 'nwse-resize' }} />);
    if (selShapes.length === 1 && hasVertexHandles(selShapes[0].kind) && selShapes[0].kind !== 'point') {
      const s = selShapes[0];
      s.points.forEach((q, i) =>
        out.push(
          <circle key={`vh-${i}`} cx={q.x} cy={q.y} r={9 / z} fill={s.kind === 'circle' && i === 0 ? SEL_COLOR : '#fff'} stroke={SEL_COLOR} strokeWidth={3 / z} data-handle="vertex" data-owner={s.id} data-index={i} style={{ cursor: 'move' }} />,
        ),
      );
    }
  }

  // ── 6. 그리는 중인 모습 ──
  const ds = p.drawStyle;
  const ghost = { stroke: ds.stroke, strokeWidth: Math.max(ds.strokeWidth, 2 / z), fill: ds.fill, opacity: 0.6, pointerEvents: 'none' as const };
  const live = p.live;
  if (live?.kind === 'marquee') {
    const b = boxOf([live.a, live.b]);
    out.push(<rect key="mq" x={b.x} y={b.y} width={b.w} height={b.h} fill={SEL_COLOR} fillOpacity={0.08} stroke={SEL_COLOR} strokeWidth={1.5 / z} strokeDasharray={`${5 / z} ${4 / z}`} pointerEvents="none" />);
  }
  if (live?.kind === 'draw') {
    const { a, b } = live;
    switch (live.tool) {
      case 'segment':
        out.push(<path key="lv" d={polyPath([a, b], false)} {...ghost} fill="none" />);
        break;
      case 'line':
        out.push(<path key="lv" d={polyPath(extendedLine(a, b), false)} {...ghost} fill="none" />);
        break;
      case 'rect':
        out.push(<path key="lv" d={polyPath([a, vec(b.x, a.y), b, vec(a.x, b.y)], true)} {...ghost} />);
        break;
      case 'circle':
        out.push(<circle key="lv" cx={a.x} cy={a.y} r={dist(a, b)} {...ghost} />);
        out.push(<path key="lvr" d={polyPath([a, b], false)} stroke="#667085" strokeWidth={1.5 / z} strokeDasharray={`${4 / z} ${4 / z}`} pointerEvents="none" />);
        break;
      case 'freehand':
        out.push(<path key="lv" d={smoothPath(live.pts ?? [])} {...ghost} fill="none" opacity={0.9} />);
        break;
      case 'axis':
        out.push(<path key="lv" d={polyPath(extendedLine(a, b), false)} stroke={AXIS_COLOR} strokeWidth={3 / z} strokeDasharray={`${12 / z} ${8 / z}`} pointerEvents="none" />);
        break;
    }
    if (live.tool !== 'freehand') out.push(<circle key="lva" cx={a.x} cy={a.y} r={5 / z} fill={SEL_COLOR} pointerEvents="none" />);
  }
  if (p.draft.length) {
    const pts = p.hover ? [...p.draft, p.hover] : p.draft;
    out.push(<path key="df" d={polyPath(pts, false)} {...ghost} fill="none" strokeDasharray={`${8 / z} ${5 / z}`} />);
    if (p.draft.length >= 2) out.push(<path key="dff" d={polyPath(pts, true)} fill={ds.fill} opacity={0.25} pointerEvents="none" />);
    p.draft.forEach((q, i) => out.push(<circle key={`dp-${i}`} cx={q.x} cy={q.y} r={(i === 0 && p.tool === 'polygon' && p.draft.length >= 3 ? 12 : 6) / z} fill={i === 0 ? '#fff' : SEL_COLOR} stroke={SEL_COLOR} strokeWidth={3 / z} pointerEvents="none" />));
  }
  const isDrawTool = !['select', 'move', 'rotate', 'scale', 'pan'].includes(p.tool);
  if (p.hover && isDrawTool) {
    out.push(<circle key="hv" cx={p.hover.x} cy={p.hover.y} r={6 / z} fill="none" stroke={p.snapLabel ? '#12B76A' : '#667085'} strokeWidth={2.5 / z} pointerEvents="none" />);
    if (p.tool === 'center') out.push(<g key="hvc" opacity={0.6}><CenterMark p={p.hover} z={z} /></g>);
    if (p.tool === 'point') out.push(<circle key="hvp" cx={p.hover.x} cy={p.hover.y} r={Math.max(5, ds.strokeWidth * 1.6)} fill={ds.stroke} opacity={0.5} pointerEvents="none" />);
  }
  if (p.snapLabel && p.hover) out.push(<Pill key="snap" at={add(p.hover, vec(0, -26 / z))} text={p.snapLabel} z={z} color="#027A48" size={12} />);
  if (p.measure) out.push(<Pill key="meas" at={p.measure.at} text={p.measure.text} z={z} color="#fff" bg="#1d2a4d" size={14} />);

  return <g className="overlays">{out}</g>;
}

/** 학습 모드: 대응점, 대응변, 수직·같은 거리 표시 */
function Learning({ fig, byId, z, cell }: { fig: SymFigure; byId: Map<string, Shape>; z: number; cell: (px: number) => number }) {
  const out: ReactNode[] = [];
  let nameIdx = 0;
  const color = fig.type === 'line' ? AXIS_COLOR : CENTER_COLOR;
  let shownPairs = 0;
  let arcDone = false;
  for (const pair of fig.pairs) {
    const a = byId.get(pair.orig);
    const b = byId.get(pair.copy);
    if (!a || !b || a.points.length !== b.points.length) continue;
    // 대응변: 같은 색으로 칠해서 어느 변끼리 짝인지 보여 준다
    const ea = shapeEdges(a);
    const eb = shapeEdges(b);
    if (a.kind !== 'line') {
      ea.forEach(([p1, p2], i) => {
        const c = EDGE_COLORS[i % EDGE_COLORS.length];
        out.push(<path key={`ea-${pair.orig}-${i}`} d={polyPath([p1, p2], false)} stroke={c} strokeWidth={6 / z} strokeOpacity={0.75} strokeLinecap="round" pointerEvents="none" />);
        if (eb[i]) out.push(<path key={`eb-${pair.copy}-${i}`} d={polyPath(eb[i], false)} stroke={c} strokeWidth={6 / z} strokeOpacity={0.75} strokeLinecap="round" pointerEvents="none" />);
      });
    }
    for (const i of sampleIndices(a)) {
      if (shownPairs >= 10) break;
      shownPairs++;
      const P = a.points[i];
      const Q = b.points[i];
      const name = POINT_NAMES[nameIdx++ % POINT_NAMES.length];
      const same = dist(P, Q) < 1.5;
      if (fig.type === 'line' && fig.axis) {
        const [s, e] = fig.axis;
        const F = footOnLine(P, s, e);
        if (same) {
          out.push(<circle key={`on-${pair.orig}-${i}`} cx={P.x} cy={P.y} r={12 / z} fill="none" stroke={color} strokeWidth={3 / z} pointerEvents="none" />);
          out.push(<Pill key={`onl-${pair.orig}-${i}`} at={add(P, vec(0, -26 / z))} text={`점 ${name}: 축 위라서 그대로!`} z={z} color={color} size={12} />);
          continue;
        }
        out.push(<path key={`pq-${pair.orig}-${i}`} d={polyPath([P, Q], false)} stroke="#475467" strokeWidth={2 / z} strokeDasharray={`${6 / z} ${5 / z}`} pointerEvents="none" />);
        // 직각 표시
        const d = norm(sub(e, s));
        const n = norm(sub(P, F));
        const k = 12 / z;
        const c1 = add(F, mul(n, k));
        const c2 = add(add(F, mul(n, k)), mul(d, k));
        const c3 = add(F, mul(d, k));
        out.push(<path key={`ra-${pair.orig}-${i}`} d={`M${c1.x} ${c1.y}L${c2.x} ${c2.y}L${c3.x} ${c3.y}`} fill="none" stroke={color} strokeWidth={2 / z} pointerEvents="none" />);
        out.push(<Tick key={`t1-${pair.orig}-${i}`} a={P} b={F} z={z} count={(i % 3) + 1} />);
        out.push(<Tick key={`t2-${pair.orig}-${i}`} a={F} b={Q} z={z} count={(i % 3) + 1} />);
        if (shownPairs <= 4) out.push(<Pill key={`dl-${pair.orig}-${i}`} at={add(mid(P, F), mul(d, 16 / z))} text={`${cell(dist(P, F))}칸`} z={z} color="#344054" size={11} />);
        if (shownPairs <= 4) out.push(<Pill key={`dr-${pair.orig}-${i}`} at={add(mid(F, Q), mul(d, 16 / z))} text={`${cell(dist(F, Q))}칸`} z={z} color="#344054" size={11} />);
      } else if (fig.center) {
        const C = fig.center;
        if (same) continue;
        out.push(<path key={`pq-${pair.orig}-${i}`} d={polyPath([P, Q], false)} stroke="#475467" strokeWidth={2 / z} strokeDasharray={`${6 / z} ${5 / z}`} pointerEvents="none" />);
        out.push(<Tick key={`t1-${pair.orig}-${i}`} a={P} b={C} z={z} count={(i % 3) + 1} />);
        out.push(<Tick key={`t2-${pair.orig}-${i}`} a={C} b={Q} z={z} count={(i % 3) + 1} />);
        if (shownPairs <= 3) {
          const off = vec(0, -14 / z);
          out.push(<Pill key={`dl-${pair.orig}-${i}`} at={add(mid(P, C), off)} text={`${cell(dist(P, C))}칸`} z={z} color="#344054" size={11} />);
          out.push(<Pill key={`dr-${pair.orig}-${i}`} at={add(mid(C, Q), off)} text={`${cell(dist(C, Q))}칸`} z={z} color="#344054" size={11} />);
        }
        if (!arcDone && dist(P, C) > 30 / z) {
          // 180° 돌아가는 화살표
          arcDone = true;
          const r = Math.min(46 / z, dist(P, C) * 0.6);
          const u = norm(sub(P, C));
          const s0 = add(C, mul(u, r));
          const s1 = add(C, mul(u, -r));
          out.push(<path key="arc" d={`M${s0.x} ${s0.y}A${r} ${r} 0 0 1 ${s1.x} ${s1.y}`} fill="none" stroke={color} strokeWidth={3 / z} markerEnd="url(#ed-arrow)" pointerEvents="none" />);
          const perp = vec(-u.y, u.x);
          out.push(<Pill key="arcl" at={add(C, mul(perp, -r - 16 / z))} text="180°" z={z} color={color} size={12} />);
        }
      }
      out.push(<Pill key={`n1-${pair.orig}-${i}`} at={add(P, vec(-14 / z, -18 / z))} text={name} z={z} color={color} size={13} />);
      out.push(<Pill key={`n2-${pair.copy}-${i}`} at={add(Q, vec(14 / z, -18 / z))} text={`${name}′`} z={z} color="#fff" bg={color} size={13} />);
    }
  }
  return <g pointerEvents="none">{out}</g>;
}


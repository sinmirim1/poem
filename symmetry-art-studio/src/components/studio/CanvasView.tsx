/**
 * 작품 캔버스 (도화지)
 *  - 도형 그리기, 고르기, 옮기기, 돌리기, 크기 바꾸기, 꼭짓점 끌기
 *  - 대칭축 그리기·옮기기, 중심점 찍기·옮기기
 *  - 확대/축소(휠, 두 손가락), 화면 옮기기
 * 마우스와 태블릿 펜·손가락을 모두 Pointer 이벤트 하나로 처리한다.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Doc, Shape, ToolId, Vec } from '../../types';
import { useStore } from '../../state/store';
import { PAPER, PAPER_CENTER, extendedLine, polyPath, polygonArea, shapeBounds, simplifyPath, smoothPath } from '../../geometry/shapes';
import { add, boxOf, boxesOverlap, dist, lineAngleForDisplay, mid, sub, toDeg, vec } from '../../geometry/vec';
import { collectDirections, collectSnapTargets, snapDirection, snapPoint, snapToGrid, type SnapResult } from '../../geometry/snap';
import { checkFigure } from '../../geometry/symmetry';
import { addShapes, groupCenter, linkedGroup, moveGroup, rotateGroup, scaleGroup, setVertex } from '../../state/ops';
import { ArtDefs, ArtworkContent, BackgroundLayer, ShapesLayer } from '../art/Artwork';
import { Overlays, type Live } from './Overlays';
import { Icon } from '../Icon';
import { TOOL_INFO } from '../../data/texts';
import { uid } from '../../utils/id';

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'move'; ids: Set<string>; start: Vec; ref: Vec; base: Doc; changed: boolean }
  | { kind: 'rotate'; ids: Set<string>; c: Vec; a0: number; base: Doc; changed: boolean }
  | { kind: 'scale'; ids: Set<string>; c: Vec; d0: number; base: Doc; changed: boolean }
  | { kind: 'vertex'; id: string; index: number; base: Doc; changed: boolean }
  | { kind: 'axisMove'; id: string; start: Vec; base: Doc; changed: boolean }
  | { kind: 'axisEnd'; id: string; end: 0 | 1; base: Doc; changed: boolean }
  | { kind: 'centerMove'; id: string; base: Doc; changed: boolean }
  | { kind: 'marquee'; start: Vec; additive: boolean; cur: Vec }
  | { kind: 'draw'; tool: ToolId; start: Vec; cur: Vec; pts: Vec[] }
  | { kind: 'pinch'; d0: number; m0: Vec; z0: number; vx: number; vy: number };

const DRAG_TOOLS: ToolId[] = ['segment', 'line', 'rect', 'circle', 'freehand', 'axis'];
const DIRECTION_TOOLS: ToolId[] = ['segment', 'line', 'axis'];
const EDIT_TOOLS: ToolId[] = ['select', 'move', 'rotate', 'scale', 'pan'];

/** 클릭 영역: 실제 도형보다 조금 두껍게 만들어 손가락으로도 잘 잡히게 한다 */
const HitLayer = memo(function HitLayer({ shapes, z }: { shapes: Shape[]; z: number }) {
  const minW = 16 / z;
  return (
    <g>
      {shapes.map((s) => {
        const common = { 'data-sid': s.id, stroke: 'transparent', strokeWidth: Math.max(s.strokeWidth + 6 / z, minW) } as const;
        const p0 = s.points[0];
        switch (s.kind) {
          case 'point':
            return <circle key={s.id} cx={p0.x} cy={p0.y} r={14 / z} fill="transparent" data-sid={s.id} />;
          case 'circle':
            return <circle key={s.id} cx={p0.x} cy={p0.y} r={dist(p0, s.points[1] ?? p0)} fill={s.fill === 'none' ? 'none' : 'transparent'} pointerEvents={s.fill === 'none' ? 'stroke' : 'all'} {...common} />;
          case 'segment':
            return <path key={s.id} d={polyPath(s.points, false)} fill="none" pointerEvents="stroke" {...common} />;
          case 'line':
            return <path key={s.id} d={polyPath(extendedLine(s.points[0], s.points[1] ?? p0), false)} fill="none" pointerEvents="stroke" {...common} />;
          case 'freehand':
            return <path key={s.id} d={smoothPath(s.points)} fill="none" pointerEvents="stroke" {...common} />;
          case 'text':
          case 'bubble': {
            const b = shapeBounds(s);
            return <rect key={s.id} x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" data-sid={s.id} />;
          }
          default:
            return <path key={s.id} d={polyPath(s.points, true)} fill={s.fill === 'none' ? 'none' : 'transparent'} pointerEvents={s.fill === 'none' ? 'stroke' : 'all'} {...common} />;
        }
      })}
    </g>
  );
});

export function CanvasView() {
  const { state, dispatch } = useStore();
  const { doc, settings, tool } = state;
  const areaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ zoom: 0.5, x: 0, y: 0 });
  const [hover, setHover] = useState<Vec | null>(null);
  const [snapLabel, setSnapLabel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Vec[]>([]);
  const [live, setLive] = useState<Live>(null);
  const [measure, setMeasure] = useState<{ text: string; at: Vec } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Vec>());
  const spaceDown = useRef(false);

  // 이벤트 처리 함수 안에서 항상 최신 값을 보도록 ref에 담아 둔다.
  const stateRef = useRef(state);
  stateRef.current = state;
  const viewRef = useRef(view);
  viewRef.current = view;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const z = view.zoom;
  const grid = settings.gridSize;
  const cells = (px: number) => Math.round((px / grid) * 10) / 10;

  // ── 화면 맞추기 ──
  const fit = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) return;
    const zoom = Math.min((r.width - 40) / PAPER.w, (r.height - 40) / PAPER.h);
    setView({ zoom, x: (r.width - PAPER.w * zoom) / 2, y: (r.height - PAPER.h * zoom) / 2 });
  }, []);

  useLayoutEffect(() => {
    fit();
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const zoomAt = useCallback((screen: Vec, factor: number) => {
    setView((v) => {
      const zoom = Math.min(4, Math.max(0.15, v.zoom * factor));
      const wx = (screen.x - v.x) / v.zoom;
      const wy = (screen.y - v.y) / v.zoom;
      return { zoom, x: screen.x - wx * zoom, y: screen.y - wy * zoom };
    });
  }, []);

  // 마우스 휠 확대/축소 (페이지가 스크롤되지 않게 passive:false로 등록)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomAt(vec(e.clientX - r.left, e.clientY - r.top), Math.exp(-e.deltaY * 0.0015));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // 도구를 바꾸면 그리던 다각형은 취소
  useEffect(() => {
    setDraft([]);
    setLive(null);
    setMeasure(null);
    setSnapLabel(null);
  }, [tool]);

  // ── 좌표 바꾸기 ──
  const screenPt = (e: { clientX: number; clientY: number }): Vec => {
    const r = svgRef.current!.getBoundingClientRect();
    return vec(e.clientX - r.left, e.clientY - r.top);
  };
  const toWorld = (sp: Vec): Vec => {
    const v = viewRef.current;
    return vec((sp.x - v.x) / v.zoom, (sp.y - v.y) / v.zoom);
  };

  /** 격자점·꼭짓점·중점에 딱 맞추기 */
  const snapAt = (raw: Vec, exclude: Set<string> = new Set(), d: Doc = stateRef.current.doc): SnapResult => {
    const s = stateRef.current.settings;
    return snapPoint(raw, {
      grid: s.snapGrid,
      gridSize: s.gridSize,
      targets: s.snapPoints ? collectSnapTargets(d, exclude) : [],
      tol: 14 / viewRef.current.zoom,
    });
  };

  /** 선을 그릴 때 수평·수직·평행 방향에 딱 맞추기 */
  const snapDir = (start: Vec, sn: SnapResult, exclude: Set<string> = new Set()): SnapResult => {
    const s = stateRef.current.settings;
    if (!s.snapAngle || sn.label) return sn;
    const r = snapDirection(start, sn.p, collectDirections(stateRef.current.doc, exclude), s.snapGrid ? s.gridSize : null);
    return r ?? sn;
  };

  const newShape = (kind: Shape['kind'], points: Vec[], extra: Partial<Shape> = {}): Shape => {
    const ds = stateRef.current.drawStyle;
    const open = kind === 'segment' || kind === 'line' || kind === 'freehand' || kind === 'point';
    return {
      id: uid(),
      kind,
      points,
      stroke: ds.stroke,
      strokeWidth: ds.strokeWidth,
      fill: open ? 'none' : ds.fill,
      opacity: ds.opacity,
      lineStyle: ds.lineStyle,
      rotation: 0,
      ...extra,
    };
  };

  const commitShape = (s: Shape) => {
    dispatch({ type: 'doc', doc: addShapes(stateRef.current.doc, [s]), record: true, select: [s.id] });
  };

  const toast = (text: string, tone: 'info' | 'good' | 'warn' = 'info') => dispatch({ type: 'toast', text, tone });

  /** 다각형/삼각형 완성 */
  const finishPolygon = (pts: Vec[]) => {
    setDraft([]);
    if (pts.length < 3 || polygonArea(pts) < 4) {
      toast('점들이 한 줄 위에 있어서 면이 생기지 않아요. 다른 곳을 눌러 다시 그려 보세요.', 'warn');
      return;
    }
    commitShape(newShape(pts.length === 3 ? 'triangle' : 'polygon', pts));
  };

  const cancelGesture = () => {
    const g = gesture.current;
    if (g && 'base' in g) dispatch({ type: g.changed ? 'revert' : 'discard' });
    gesture.current = null;
    setLive(null);
    setMeasure(null);
  };

  // ── 누르기 ──
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* 일부 브라우저는 지원하지 않음 */
    }
    const sp = screenPt(e);
    pointers.current.set(e.pointerId, sp);

    // 두 손가락: 확대/축소 + 화면 옮기기
    if (pointers.current.size === 2) {
      cancelGesture();
      const [a, b] = [...pointers.current.values()];
      const v = viewRef.current;
      gesture.current = { kind: 'pinch', d0: Math.max(10, dist(a, b)), m0: mid(a, b), z0: v.zoom, vx: v.x, vy: v.y };
      return;
    }
    if (pointers.current.size > 2 || e.button === 2) return;

    const st = stateRef.current;
    const raw = toWorld(sp);
    const el = e.target as Element;
    const v = viewRef.current;

    if (e.button === 1 || st.tool === 'pan' || spaceDown.current || st.popPreview) {
      gesture.current = { kind: 'pan', sx: sp.x, sy: sp.y, vx: v.x, vy: v.y };
      return;
    }

    // 손잡이 (돌리기·크기·꼭짓점·대칭축 끝점)
    const handle = el.closest('[data-handle]') as SVGElement | null;
    if (handle) {
      const kind = handle.dataset.handle;
      dispatch({ type: 'checkpoint' });
      if (kind === 'rotate' || kind === 'scale') {
        const ids = linkedGroup(st.doc, st.selection);
        const c = groupCenter(st.doc, ids);
        if (kind === 'rotate') gesture.current = { kind: 'rotate', ids, c, a0: toDeg(Math.atan2(raw.y - c.y, raw.x - c.x)), base: st.doc, changed: false };
        else gesture.current = { kind: 'scale', ids, c, d0: Math.max(8, dist(raw, c)), base: st.doc, changed: false };
      } else if (kind === 'vertex') {
        gesture.current = { kind: 'vertex', id: handle.dataset.owner!, index: Number(handle.dataset.index), base: st.doc, changed: false };
      } else if (kind === 'axisEnd') {
        gesture.current = { kind: 'axisEnd', id: handle.dataset.id!, end: Number(handle.dataset.end) as 0 | 1, base: st.doc, changed: false };
      }
      return;
    }

    const tool = st.tool;
    const shapeEl = el.closest('[data-sid]') as SVGElement | null;
    const guideEl = el.closest('[data-guide]') as SVGElement | null;
    const hitId = shapeEl?.dataset.sid ?? null;

    if (tool === 'select' || tool === 'move') {
      if (!hitId && guideEl) {
        const id = guideEl.dataset.id!;
        const isAxis = guideEl.dataset.guide === 'axis';
        dispatch({ type: 'select', ids: [] });
        dispatch({ type: 'ui', patch: isAxis ? { guideSel: { kind: 'axis', id }, activeAxisId: id } : { guideSel: { kind: 'center', id }, activeCenterId: id } });
        dispatch({ type: 'checkpoint' });
        gesture.current = isAxis
          ? { kind: 'axisMove', id, start: raw, base: st.doc, changed: false }
          : { kind: 'centerMove', id, base: st.doc, changed: false };
        return;
      }
      if (hitId) {
        let sel = st.selection;
        const additive = e.shiftKey || st.multi;
        if (additive) {
          if (sel.includes(hitId)) {
            dispatch({ type: 'select', ids: sel.filter((x) => x !== hitId) });
            return;
          }
          sel = [...sel, hitId];
        } else if (!sel.includes(hitId)) sel = [hitId];
        dispatch({ type: 'select', ids: sel });
        const shape = st.doc.shapes.find((s) => s.id === hitId)!;
        dispatch({ type: 'checkpoint' });
        gesture.current = { kind: 'move', ids: linkedGroup(st.doc, sel), start: raw, ref: shape.points[0], base: st.doc, changed: false };
        return;
      }
      dispatch({ type: 'ui', patch: { guideSel: null } });
      if (tool === 'select') {
        const additive = e.shiftKey || st.multi;
        if (!additive) dispatch({ type: 'select', ids: [] });
        gesture.current = { kind: 'marquee', start: raw, cur: raw, additive };
      } else dispatch({ type: 'select', ids: [] });
      return;
    }

    if (tool === 'rotate' || tool === 'scale') {
      let sel = st.selection;
      if (hitId && !sel.includes(hitId)) {
        sel = [hitId];
        dispatch({ type: 'select', ids: sel });
      }
      if (!sel.length) {
        toast(tool === 'rotate' ? '돌릴 도형을 먼저 눌러서 골라 주세요.' : '크기를 바꿀 도형을 먼저 눌러서 골라 주세요.', 'info');
        return;
      }
      const ids = linkedGroup(st.doc, sel);
      const c = groupCenter(st.doc, ids);
      dispatch({ type: 'checkpoint' });
      gesture.current =
        tool === 'rotate'
          ? { kind: 'rotate', ids, c, a0: toDeg(Math.atan2(raw.y - c.y, raw.x - c.x)), base: st.doc, changed: false }
          : { kind: 'scale', ids, c, d0: Math.max(8, dist(raw, c)), base: st.doc, changed: false };
      return;
    }

    // ── 그리기 도구 ──
    if (tool === 'point') {
      commitShape(newShape('point', [snapAt(raw).p]));
      return;
    }
    if (tool === 'center') {
      const p = snapAt(raw).p;
      const id = uid('c');
      dispatch({ type: 'doc', doc: { ...st.doc, centers: [...st.doc.centers, { id, p }] }, record: true });
      dispatch({ type: 'ui', patch: { activeCenterId: id, guideSel: { kind: 'center', id } } });
      dispatch({ type: 'tool', tool: 'select' });
      toast('대칭의 중심을 찍었어요. 도형을 고르고 "점대칭 복사"를 눌러 보세요.', 'good');
      return;
    }
    if (tool === 'text' || tool === 'bubble') {
      const p = snapAt(raw).p;
      const s =
        tool === 'text'
          ? newShape('text', [p], { text: '나의 작품', fontSize: 56, fill: st.drawStyle.fill === 'none' ? '#111111' : st.drawStyle.fill, stroke: '#111111', strokeWidth: 4 })
          : newShape('bubble', [p], { text: '와!', fontSize: 52, fill: '#FFFFFF', stroke: '#111111', strokeWidth: 5, lineStyle: 'solid' });
      commitShape(s);
      dispatch({ type: 'tool', tool: 'select' });
      dispatch({ type: 'ui', patch: { rightOpen: true } });
      return;
    }
    if (tool === 'triangle' || tool === 'polygon') {
      const d = draftRef.current;
      const last = d[d.length - 1];
      const sn = last ? snapDir(last, snapAt(raw)) : snapAt(raw);
      if (tool === 'polygon' && d.length >= 3 && dist(sn.p, d[0]) < 18 / viewRef.current.zoom) {
        finishPolygon(d);
        return;
      }
      if (last && dist(sn.p, last) < 1) return;
      const next = [...d, sn.p];
      if (tool === 'triangle' && next.length === 3) finishPolygon(next);
      else setDraft(next);
      return;
    }
    if (DRAG_TOOLS.includes(tool)) {
      const start = tool === 'freehand' ? raw : snapAt(raw).p;
      gesture.current = { kind: 'draw', tool, start, cur: start, pts: [start] };
      setLive({ kind: 'draw', tool, a: start, b: start, pts: [start] });
    }
  };

  // ── 끌기 ──
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const sp = screenPt(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, sp);
    const g = gesture.current;
    const raw = toWorld(sp);
    const st = stateRef.current;

    if (!g) {
      // 아무것도 누르지 않은 채 움직일 때: 그리기 도구의 미리보기
      if (!EDIT_TOOLS.includes(st.tool)) {
        const d = draftRef.current;
        const sn = st.tool === 'freehand' ? { p: raw } : d.length ? snapDir(d[d.length - 1], snapAt(raw)) : snapAt(raw);
        setHover(sn.p);
        setSnapLabel(sn.label ?? null);
      } else if (st.settings.showCoords) {
        setHover(raw);
      }
      return;
    }

    switch (g.kind) {
      case 'pinch': {
        const pts = [...pointers.current.values()];
        if (pts.length < 2) return;
        const [a, b] = pts;
        const zoom = Math.min(4, Math.max(0.15, (g.z0 * dist(a, b)) / g.d0));
        const m = mid(a, b);
        const wx = (g.m0.x - g.vx) / g.z0;
        const wy = (g.m0.y - g.vy) / g.z0;
        setView({ zoom, x: m.x - wx * zoom, y: m.y - wy * zoom });
        return;
      }
      case 'pan':
        setView((v) => ({ ...v, x: g.vx + sp.x - g.sx, y: g.vy + sp.y - g.sy }));
        return;
      case 'move': {
        const target = add(g.ref, sub(raw, g.start));
        const sn = snapAt(target, g.ids, g.base);
        const d = sub(sn.p, g.ref);
        g.changed = g.changed || Math.abs(d.x) + Math.abs(d.y) > 0.01;
        dispatch({ type: 'doc', doc: moveGroup(g.base, g.ids, d) });
        setHover(sn.p);
        setSnapLabel(sn.label ?? null);
        return;
      }
      case 'rotate': {
        let deg = toDeg(Math.atan2(raw.y - g.c.y, raw.x - g.c.x)) - g.a0;
        deg = ((deg + 540) % 360) - 180;
        if (st.settings.snapAngle) deg = Math.round(deg / 15) * 15;
        else deg = Math.round(deg);
        g.changed = g.changed || deg !== 0;
        dispatch({ type: 'doc', doc: rotateGroup(g.base, g.ids, g.c, deg) });
        setMeasure({ text: deg === 0 ? '0°' : `${deg > 0 ? '시계 방향' : '시계 반대 방향'} ${Math.abs(deg)}°`, at: add(g.c, vec(0, -40 / z)) });
        return;
      }
      case 'scale': {
        let k = dist(raw, g.c) / g.d0;
        k = Math.min(8, Math.max(0.1, Math.round(k * 20) / 20));
        g.changed = g.changed || k !== 1;
        dispatch({ type: 'doc', doc: scaleGroup(g.base, g.ids, g.c, k) });
        setMeasure({ text: `${k}배`, at: add(g.c, vec(0, -40 / z)) });
        return;
      }
      case 'vertex': {
        const exclude = linkedGroup(g.base, [g.id]);
        const sn = snapAt(raw, exclude, g.base);
        g.changed = true;
        dispatch({ type: 'doc', doc: setVertex(g.base, g.id, g.index, sn.p) });
        setHover(sn.p);
        setSnapLabel(sn.label ?? null);
        return;
      }
      case 'axisMove': {
        let d = sub(raw, g.start);
        if (st.settings.snapGrid) d = snapToGrid(d, st.settings.gridSize);
        g.changed = g.changed || Math.abs(d.x) + Math.abs(d.y) > 0.01;
        dispatch({
          type: 'doc',
          doc: { ...g.base, axes: g.base.axes.map((a) => (a.id === g.id ? { ...a, p1: add(a.p1, d), p2: add(a.p2, d) } : a)) },
        });
        return;
      }
      case 'axisEnd': {
        const ax = g.base.axes.find((a) => a.id === g.id);
        if (!ax) return;
        const other = g.end === 0 ? ax.p2 : ax.p1;
        const sn = snapDir(other, snapAt(raw, new Set(), g.base));
        if (dist(sn.p, other) < 10) return;
        g.changed = true;
        dispatch({
          type: 'doc',
          doc: { ...g.base, axes: g.base.axes.map((a) => (a.id === g.id ? (g.end === 0 ? { ...a, p1: sn.p } : { ...a, p2: sn.p }) : a)) },
        });
        setMeasure({ text: `기울기 ${lineAngleForDisplay(other, sn.p)}°${sn.label ? ` · ${sn.label}` : ''}`, at: add(sn.p, vec(0, -34 / z)) });
        return;
      }
      case 'centerMove': {
        const base = { ...g.base, centers: g.base.centers.filter((c) => c.id !== g.id) };
        const sn = snapAt(raw, new Set(), base);
        g.changed = true;
        dispatch({ type: 'doc', doc: { ...g.base, centers: g.base.centers.map((c) => (c.id === g.id ? { ...c, p: sn.p } : c)) } });
        return;
      }
      case 'marquee':
        g.cur = raw;
        setLive({ kind: 'marquee', a: g.start, b: raw });
        return;
      case 'draw': {
        if (g.tool === 'freehand') {
          const last = g.pts[g.pts.length - 1];
          if (dist(last, raw) > 3 / z) g.pts.push(raw);
          g.cur = raw;
          setLive({ kind: 'draw', tool: g.tool, a: g.start, b: raw, pts: g.pts.slice() });
          return;
        }
        let sn = snapAt(raw);
        if (DIRECTION_TOOLS.includes(g.tool)) sn = snapDir(g.start, sn);
        g.cur = sn.p;
        setHover(sn.p);
        setSnapLabel(sn.label ?? null);
        setLive({ kind: 'draw', tool: g.tool, a: g.start, b: sn.p });
        const at = add(sn.p, vec(0, 34 / z));
        if (g.tool === 'rect') setMeasure({ text: `가로 ${cells(Math.abs(sn.p.x - g.start.x))}칸 × 세로 ${cells(Math.abs(sn.p.y - g.start.y))}칸`, at });
        else if (g.tool === 'circle') setMeasure({ text: `반지름 ${cells(dist(g.start, sn.p))}칸`, at });
        else setMeasure({ text: `길이 ${cells(dist(g.start, sn.p))}칸 · 기울기 ${lineAngleForDisplay(g.start, sn.p)}°`, at });
        return;
      }
    }
  };

  // ── 떼기 ──
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (pointers.current.size === 0) gesture.current = null;
      return;
    }
    gesture.current = null;
    setMeasure(null);
    const st = stateRef.current;

    if ('base' in g) {
      if (!g.changed) dispatch({ type: 'discard' });
      setSnapLabel(null);
      return;
    }
    if (g.kind === 'marquee') {
      setLive(null);
      const box = boxOf([g.start, g.cur]);
      if (box.w < 4 && box.h < 4) return;
      const hits = st.doc.shapes.filter((s) => boxesOverlap(box, shapeBounds(s))).map((s) => s.id);
      const ids = g.additive ? [...new Set([...st.selection, ...hits])] : hits;
      dispatch({ type: 'select', ids });
      return;
    }
    if (g.kind === 'draw') {
      setLive(null);
      setSnapLabel(null);
      const a = g.start;
      const b = g.cur;
      const tooSmall = dist(a, b) < 6;
      if (g.tool === 'freehand') {
        if (g.pts.length < 2) return;
        commitShape(newShape('freehand', simplifyPath(g.pts, 1.2)));
        return;
      }
      if (tooSmall) {
        toast('조금 더 길게 끌어서 그려 보세요.', 'info');
        return;
      }
      switch (g.tool) {
        case 'segment':
          commitShape(newShape('segment', [a, b]));
          break;
        case 'line':
          commitShape(newShape('line', [a, b]));
          break;
        case 'rect':
          if (Math.abs(a.x - b.x) < 4 || Math.abs(a.y - b.y) < 4) {
            toast('사각형은 가로와 세로가 모두 있어야 해요. 대각선 방향으로 끌어 보세요.', 'info');
            return;
          }
          commitShape(newShape('rect', [a, vec(b.x, a.y), b, vec(a.x, b.y)]));
          break;
        case 'circle':
          commitShape(newShape('circle', [a, b]));
          break;
        case 'axis': {
          const id = uid('a');
          dispatch({ type: 'doc', doc: { ...st.doc, axes: [...st.doc.axes, { id, p1: a, p2: b }] }, record: true });
          dispatch({ type: 'ui', patch: { activeAxisId: id, guideSel: { kind: 'axis', id } } });
          dispatch({ type: 'tool', tool: 'select' });
          toast('대칭축을 그렸어요. 도형을 고르고 "선대칭 복사"를 눌러 보세요.', 'good');
          break;
        }
      }
    }
  };

  // ── 키보드: Esc, Enter, Space ──
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') {
        spaceDown.current = true;
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        if (draftRef.current.length) setDraft([]);
        else dispatch({ type: 'select', ids: [] });
      }
      if (e.key === 'Enter' && draftRef.current.length >= 3 && stateRef.current.tool === 'polygon') finishPolygon(draftRef.current);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // finishPolygon은 ref만 쓰므로 한 번만 등록해도 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // ── 화면에 그릴 값 ──
  const group = useMemo(() => linkedGroup(doc, state.selection), [doc, state.selection]);
  const brokenFigs = useMemo(() => {
    const out = new Set<string>();
    for (const f of doc.figures) if (!checkFigure(doc, f, grid).ok) out.add(f.id);
    return out;
  }, [doc, grid]);

  const startExample = () => {
    // 빈 도화지 안내: 예시 삼각형과 세로 대칭축을 놓아 준다
    const g = grid;
    const cx = PAPER_CENTER.x;
    const cy = PAPER_CENTER.y;
    const tri = newShape('triangle', [vec(cx - 3 * g, cy - 3 * g), vec(cx - 6 * g, cy + 2 * g), vec(cx - g, cy + 2 * g)]);
    const axisId = uid('a');
    const d = addShapes({ ...doc, axes: [...doc.axes, { id: axisId, p1: vec(cx, 0), p2: vec(cx, PAPER.h) }] }, [tri]);
    dispatch({ type: 'doc', doc: d, record: true, select: [tri.id] });
    dispatch({ type: 'ui', patch: { activeAxisId: axisId } });
    dispatch({ type: 'tool', tool: 'select' });
    toast('삼각형과 세로 대칭축을 놓았어요. 이제 왼쪽 파란 "선대칭 복사" 버튼을 눌러 보세요!', 'good');
  };

  const isEmpty = doc.shapes.length === 0 && state.step <= 3;
  const tiledPreview = state.popPreview && doc.popGrid > 1;
  const gridColor = '#8EA0BF';

  return (
    <div className="canvas-area" ref={areaRef}>
      <svg
        ref={svgRef}
        className={`canvas-svg tool-${tool}${tiledPreview ? ' tool-pan' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => !gesture.current && setHover(null)}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => {
          if (tool === 'polygon' && draftRef.current.length >= 3) finishPolygon(draftRef.current);
        }}
        role="application"
        aria-label="작품 도화지"
      >
        <defs>
          <ArtDefs prefix="ed" />
          <pattern id="ed-grid" width={grid} height={grid} patternUnits="userSpaceOnUse">
            <path d={`M${grid} 0V${grid}H0`} fill="none" stroke={gridColor} strokeWidth={1 / z} strokeOpacity={0.55} />
          </pattern>
          <pattern id="ed-grid5" width={grid * 4} height={grid * 4} patternUnits="userSpaceOnUse">
            <path d={`M${grid * 4} 0V${grid * 4}H0`} fill="none" stroke={gridColor} strokeWidth={2 / z} strokeOpacity={0.6} />
          </pattern>
          <marker id="ed-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#8B3DFF" />
          </marker>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${z})`}>
          <rect x={-6 / z} y={-6 / z} width={PAPER.w + 12 / z} height={PAPER.h + 12 / z} fill="#c9d2e3" rx={4 / z} />
          {tiledPreview ? (
            <ArtworkContent doc={doc} prefix="ed" tiled />
          ) : (
            <>
              <g clipPath="url(#ed-paper)">
                <BackgroundLayer bg={doc.background} prefix="ed" />
                {settings.grid && (
                  <g pointerEvents="none">
                    <rect width={PAPER.w} height={PAPER.h} fill="url(#ed-grid)" />
                    <rect width={PAPER.w} height={PAPER.h} fill="url(#ed-grid5)" />
                  </g>
                )}
              </g>
              <ShapesLayer shapes={doc.shapes} prefix="ed" />
              {/* 도화지 밖은 흐리게 가린다: 저장할 때는 잘려서 보이지 않는 부분 */}
              <path
                d={`M-20000 -20000H20000V20000H-20000Z M0 0V${PAPER.h}H${PAPER.w}V0Z`}
                fill="#e9edf5"
                fillOpacity={0.82}
                fillRule="evenodd"
                pointerEvents="none"
              />
              <HitLayer shapes={doc.shapes} z={z} />
              <Overlays
                doc={doc}
                z={z}
                tool={tool}
                settings={settings}
                selection={state.selection}
                group={group}
                activeAxisId={state.activeAxisId}
                activeCenterId={state.activeCenterId}
                guideSel={state.guideSel}
                ownSym={state.ownSym}
                brokenFigs={brokenFigs}
                live={live}
                draft={draft}
                hover={hover}
                snapLabel={snapLabel}
                measure={measure}
                drawStyle={state.drawStyle}
              />
            </>
          )}
        </g>
      </svg>

      {isEmpty && (
        <div className="empty-card">
          <h3>처음이라면 이렇게 시작해 보세요</h3>
          <ol>
            <li>
              왼쪽 <b>도형 그리기</b>에서 <b>삼각형</b>을 고르고, 도화지에 꼭짓점 3개를 찍어요.
            </li>
            <li>
              <b>세로 대칭축</b> 버튼을 눌러 도화지 가운데에 대칭축을 놓아요.
            </li>
            <li>
              삼각형을 고른 채 파란 <b>선대칭 복사</b> 버튼을 누르면 선대칭 도형 완성!
            </li>
          </ol>
          <button className="btn primary" onClick={startExample}>
            <Icon name="sparkle" /> 예시 삼각형 놓고 시작하기
          </button>
        </div>
      )}

      {tool === 'polygon' && draft.length >= 3 && (
        <button className="btn primary floating-finish" onClick={() => finishPolygon(draftRef.current)}>
          <Icon name="check" /> 다 그렸어요
        </button>
      )}
      {draft.length > 0 && (
        <button className="btn floating-cancel" onClick={() => setDraft([])}>
          <Icon name="close" /> 그리기 취소
        </button>
      )}

      {tiledPreview && <div className="preview-banner">반복 미리보기 중이에요. 고치려면 오른쪽에서 "미리보기 끄기"를 누르세요.</div>}

      <div className="canvas-status">
        <span className="tool-hint">
          <b>{TOOL_INFO[tool].name}</b> {TOOL_INFO[tool].hint}
        </span>
        {settings.showCoords && hover && (
          <span className="coords">
            가로 {cells(hover.x)}칸 · 세로 {cells(hover.y)}칸
          </span>
        )}
      </div>

      <div className="zoom-box">
        <button className="icon-btn" onClick={() => zoomAt(vec((areaRef.current?.clientWidth ?? 0) / 2, (areaRef.current?.clientHeight ?? 0) / 2), 1 / 1.25)} aria-label="작게 보기" title="작게 보기">
          <Icon name="zoomOut" />
        </button>
        <span className="zoom-val">{Math.round(z * 100)}%</span>
        <button className="icon-btn" onClick={() => zoomAt(vec((areaRef.current?.clientWidth ?? 0) / 2, (areaRef.current?.clientHeight ?? 0) / 2), 1.25)} aria-label="크게 보기" title="크게 보기">
          <Icon name="zoomIn" />
        </button>
        <button className="icon-btn" onClick={fit} aria-label="화면에 맞추기" title="도화지를 화면에 맞추기">
          <Icon name="fit" />
        </button>
      </div>
    </div>
  );
}


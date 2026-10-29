/**
 * 정확한 작도를 돕는 "딱 맞추기"
 *  - 격자점에 딱 맞추기
 *  - 꼭짓점·중점·중심에 딱 맞추기
 *  - 수평·수직·평행 방향에 딱 맞추기
 */
import type { Doc, Vec } from '../types';
import { add, dist, dot, mid, mul, norm, sub, toDeg, toRad, vec } from './vec';
import { shapeEdges } from './shapes';

export interface SnapTarget {
  p: Vec;
  label: string;
}

export interface SnapResult {
  p: Vec;
  label?: string;
}

export function snapToGrid(p: Vec, size: number): Vec {
  return vec(Math.round(p.x / size) * size, Math.round(p.y / size) * size);
}

/** 맞출 수 있는 점들을 모은다 (exclude: 지금 움직이는 도형은 빼기) */
export function collectSnapTargets(doc: Doc, exclude: Set<string> = new Set()): SnapTarget[] {
  const out: SnapTarget[] = [];
  for (const s of doc.shapes) {
    if (exclude.has(s.id) || s.kind === 'text' || s.kind === 'bubble' || s.kind === 'freehand') continue;
    if (s.kind === 'circle') {
      out.push({ p: s.points[0], label: '원의 중심' });
      continue;
    }
    for (const p of s.points) out.push({ p, label: s.kind === 'point' ? '점' : '꼭짓점' });
    for (const [a, b] of shapeEdges(s)) if (s.kind !== 'line') out.push({ p: mid(a, b), label: '중점' });
  }
  for (const c of doc.centers) out.push({ p: c.p, label: '대칭의 중심' });
  return out;
}

export function snapPoint(
  raw: Vec,
  opts: { grid: boolean; gridSize: number; targets: SnapTarget[]; tol: number },
): SnapResult {
  let best: SnapTarget | null = null;
  let bestD = opts.tol;
  for (const t of opts.targets) {
    const d = dist(raw, t.p);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  if (best) return { p: best.p, label: best.label };
  if (opts.grid) return { p: snapToGrid(raw, opts.gridSize), label: undefined };
  return { p: raw };
}

/** 이미 있는 선들의 방향 (평행·수직 맞추기에 쓴다) */
export function collectDirections(doc: Doc, exclude: Set<string> = new Set()): { deg: number; label: string }[] {
  const out: { deg: number; label: string }[] = [
    { deg: 0, label: '수평' },
    { deg: 90, label: '수직' },
    { deg: 45, label: '45°' },
    { deg: 135, label: '45°' },
  ];
  const addDir = (a: Vec, b: Vec) => {
    const d = toDeg(Math.atan2(b.y - a.y, b.x - a.x));
    out.push({ deg: ((d % 180) + 180) % 180, label: '평행 ∥' });
    out.push({ deg: (((d + 90) % 180) + 180) % 180, label: '수직 ⊥' });
  };
  for (const s of doc.shapes) {
    if (exclude.has(s.id)) continue;
    for (const [a, b] of shapeEdges(s)) addDir(a, b);
  }
  for (const ax of doc.axes) addDir(ax.p1, ax.p2);
  return out;
}

/**
 * start에서 p로 그리는 선이 수평·수직·평행·수직(⊥)에 가까우면 그 방향으로 딱 맞춘다.
 * 격자점 위의 점이 이미 그 방향이면 격자점을 그대로 쓴다.
 */
export function snapDirection(
  start: Vec,
  p: Vec,
  dirs: { deg: number; label: string }[],
  gridSize: number | null,
  tolDeg = 4,
): SnapResult | null {
  const v = sub(p, start);
  if (Math.hypot(v.x, v.y) < 6) return null;
  const cur = ((toDeg(Math.atan2(v.y, v.x)) % 180) + 180) % 180;
  let best: { deg: number; label: string } | null = null;
  let bestDiff = tolDeg;
  for (const d of dirs) {
    let diff = Math.abs(cur - d.deg);
    diff = Math.min(diff, 180 - diff);
    if (diff < bestDiff - 1e-6) {
      bestDiff = diff;
      best = d;
    }
  }
  if (!best) return null;
  const dir = vec(Math.cos(toRad(best.deg)), Math.sin(toRad(best.deg)));
  let q = add(start, mul(dir, dot(v, dir)));
  if (gridSize) {
    const g = vec(Math.round(q.x / gridSize) * gridSize, Math.round(q.y / gridSize) * gridSize);
    const gv = norm(sub(g, start));
    if (Math.abs(Math.abs(dot(gv, dir)) - 1) < 1e-6) q = g;
  }
  return { p: q, label: best.label };
}
